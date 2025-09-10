// Data Processor - Handles all data uploads and aggregation
class DataProcessor {
    constructor() {
        if (!firebase || !firebase.firestore) {
            console.error('Firebase not initialized!');
            throw new Error('Firebase must be initialized before using DataProcessor');
        }
        this.db = firebase.firestore();
        console.log('DataProcessor initialized with Firebase');
        this.camps = {
            "Fire": [1400, 1068, 1471, 2162, 2197, 1520],
            "Earth": [1244, 1694, 2944, 3590, 2546, 1014],
            "Water": [3554, 1896, 1569, 3152, 3596, 2711, 1267],
            "Wind": [2352, 2973, 1477, 1294, 1732, 2509, 1359]
        };
    }

    // Get camp for a kingdom
    getKingdomCamp(kdNumber) {
        const kdNum = parseInt(kdNumber);
        console.log(`Looking for kingdom ${kdNum} in camps...`);
        
        for (const [camp, kingdoms] of Object.entries(this.camps)) {
            if (kingdoms.includes(kdNum)) {
                console.log(`Found kingdom ${kdNum} in ${camp} camp`);
                return camp;
            }
        }
        console.log(`Kingdom ${kdNum} not found in any camp`);
        return null;
    }

    // Main upload processing function
    async processEventUpload(kdNumber, eventName, parsedData) {
        try {
            console.log(`Processing upload for KD ${kdNumber}, Event: ${eventName}`);
            console.log('Parsed data:', parsedData);
            
            // Get camp for this kingdom
            const camp = this.getKingdomCamp(kdNumber);
            if (!camp) {
                throw new Error(`Kingdom ${kdNumber} not found in any camp`);
            }
            
            console.log(`Kingdom ${kdNumber} belongs to ${camp} camp`);

            // Start a batch write
            const batch = this.db.batch();
            
            // 1. Process and store player data
            const playerAggregates = await this.processPlayerData(
                batch, 
                kdNumber, 
                eventName, 
                parsedData
            );
            console.log('Player aggregates:', playerAggregates);
            
            // 2. Calculate kingdom aggregates
            const kingdomAggregate = this.calculateKingdomAggregate(
                kdNumber,
                camp,
                eventName,
                playerAggregates
            );
            console.log('Kingdom aggregate calculated:', kingdomAggregate);
            
            // 3. Store kingdom aggregate
            const kingdomRef = this.db
                .collection('aggregates')
                .doc('kingdoms')
                .collection(kdNumber.toString())
                .doc(eventName);
            
            batch.set(kingdomRef, kingdomAggregate);
            console.log('Added kingdom aggregate to batch');
            
            // 4. Store cumulative kingdom data
            const cumulativeKingdomRef = this.db
                .collection('aggregates')
                .doc('cumulative')
                .collection('kingdoms')
                .doc(kdNumber.toString());
            
            // Use merge to update cumulative data
            batch.set(cumulativeKingdomRef, {
                kdNumber: kdNumber,
                camp: camp,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('Added cumulative kingdom data to batch');
            
            // Commit the batch
            console.log('Committing batch write...');
            await batch.commit();
            console.log('Batch write committed successfully');
            
            // 5. Update camp aggregates (separate transaction for atomicity)
            await this.updateCampAggregates(camp, eventName, kingdomAggregate);
            
            // 6. Update cumulative aggregates
            await this.updateCumulativeAggregates(kdNumber, camp, kingdomAggregate);
            
            console.log(`Successfully processed upload for KD ${kdNumber}`);
            return { success: true, aggregate: kingdomAggregate };
            
        } catch (error) {
            console.error('Error processing upload:', error);
            console.error('Error details:', error.stack);
            return { success: false, message: error.message };
        }
    }

    // Process individual player data
    async processPlayerData(batch, kdNumber, eventName, parsedData) {
        console.log(`Processing player data for KD ${kdNumber}, Event: ${eventName}`);
        console.log(`Player count: ${parsedData.players ? parsedData.players.length : 0}`);
        
        const aggregates = {
            totalT4: 0,
            totalT5: 0,
            totalT3: 0,
            totalT2: 0,
            totalT1: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalPower: 0,
            totalKillPoints: 0,
            resourcesGathered: 0,
            playerCount: 0,
            topPlayers: []
        };

        // Process each player
        for (const player of parsedData.players || []) {
            if (!player.characterId) continue;
            
            // Calculate player DKP (our custom formula)
            const playerDKP = this.calculatePlayerDKP({
                t4Kills: player.t4Kills || 0,
                t5Kills: player.t5Kills || 0,
                deaths: player.deaths || 0
            });
            
            // Kill Points - Use the game's official value from the player data
            const playerKP = player.totalKillPoints || 0;
            
            // Store player data
            const playerRef = this.db
                .collection('events')
                .doc(eventName)
                .collection('kingdoms')
                .doc(kdNumber.toString())
                .collection('players')
                .doc(player.characterId.toString());
            
            const playerData = {
                playerId: player.characterId.toString(),
                playerName: player.username || 'Unknown',
                power: player.currentPower || 0,
                t4Kills: player.t4Kills || 0,
                t5Kills: player.t5Kills || 0,
                t3Kills: player.t3Kills || 0,
                t2Kills: player.t2Kills || 0,
                t1Kills: player.t1Kills || 0,
                deaths: player.deaths || 0,
                healed: player.healed || 0, // If available in data
                killPoints: playerKP,
                dkp: playerDKP,
                kdNumber: kdNumber,
                eventName: eventName,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            batch.set(playerRef, playerData);
            
            // Accumulate aggregates
            aggregates.totalT4 += playerData.t4Kills;
            aggregates.totalT5 += playerData.t5Kills;
            aggregates.totalT3 += playerData.t3Kills;
            aggregates.totalT2 += playerData.t2Kills;
            aggregates.totalT1 += playerData.t1Kills;
            aggregates.totalDeaths += playerData.deaths;
            aggregates.totalHealed += playerData.healed;
            aggregates.totalPower += playerData.power;
            aggregates.totalKillPoints += playerData.killPoints;
            aggregates.playerCount++;
            
            // Track top players (keep top 10)
            aggregates.topPlayers.push({
                playerId: playerData.playerId,
                playerName: playerData.playerName,
                dkp: playerData.dkp,
                power: playerData.power
            });
        }
        
        // Sort and keep only top 10 players
        aggregates.topPlayers.sort((a, b) => b.dkp - a.dkp);
        aggregates.topPlayers = aggregates.topPlayers.slice(0, 10);
        
        // Use parsed data aggregates if available
        if (parsedData.t4Kills !== undefined) {
            aggregates.totalT4 = parsedData.t4Kills;
        }
        if (parsedData.t5Kills !== undefined) {
            aggregates.totalT5 = parsedData.t5Kills;
        }
        if (parsedData.deaths !== undefined) {
            aggregates.totalDeaths = parsedData.deaths;
        }
        if (parsedData.totalKillPoints !== undefined) {
            aggregates.totalKillPoints = parsedData.totalKillPoints; // Use game's total
        }
        if (parsedData.resourcesGathered !== undefined) {
            aggregates.resourcesGathered = parsedData.resourcesGathered;
        }
        
        return aggregates;
    }

    // Calculate kingdom aggregate
    calculateKingdomAggregate(kdNumber, camp, eventName, playerAggregates) {
        const totalDKP = this.calculateTotalDKP(
            playerAggregates.totalT4,
            playerAggregates.totalT5,
            playerAggregates.totalDeaths
        );
        
        // Use the aggregated kill points from the game's data (not calculated)
        const totalKP = playerAggregates.totalKillPoints || 0;
        
        return {
            kdNumber: kdNumber,
            camp: camp,
            eventName: eventName,
            totalT4: playerAggregates.totalT4,
            totalT5: playerAggregates.totalT5,
            totalT3: playerAggregates.totalT3,
            totalT2: playerAggregates.totalT2,
            totalT1: playerAggregates.totalT1,
            totalDeaths: playerAggregates.totalDeaths,
            totalHealed: playerAggregates.totalHealed,
            totalPower: playerAggregates.totalPower,
            totalKillPoints: totalKP,
            totalDKP: totalDKP,
            resourcesGathered: playerAggregates.resourcesGathered,
            playerCount: playerAggregates.playerCount,
            topPlayers: playerAggregates.topPlayers,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
    }

    // Update camp aggregates
    async updateCampAggregates(camp, eventName, kingdomData) {
        console.log(`Updating camp aggregates for ${camp} camp, event: ${eventName}`);
        
        const campRef = this.db
            .collection('aggregates')
            .doc('camps')
            .collection(camp)
            .doc(eventName);
        
        // Get existing camp data
        const campDoc = await campRef.get();
        let campData = campDoc.exists ? campDoc.data() : this.getEmptyCampData(camp, eventName);
        
        // Ensure kingdoms object exists (for backward compatibility)
        if (!campData.kingdoms) {
            campData.kingdoms = {};
        }
        
        console.log(`Camp ${camp} has ${Object.keys(campData.kingdoms).length} kingdoms tracked`);
        
        const previousKingdomData = campData.kingdoms[kingdomData.kdNumber] || this.getEmptyKingdomData();
        
        // Update camp totals (subtract old, add new)
        campData.totalT4 = (campData.totalT4 || 0) - previousKingdomData.totalT4 + kingdomData.totalT4;
        campData.totalT5 = (campData.totalT5 || 0) - previousKingdomData.totalT5 + kingdomData.totalT5;
        campData.totalDeaths = (campData.totalDeaths || 0) - previousKingdomData.totalDeaths + kingdomData.totalDeaths;
        campData.totalHealed = (campData.totalHealed || 0) - previousKingdomData.totalHealed + kingdomData.totalHealed;
        campData.totalDKP = (campData.totalDKP || 0) - previousKingdomData.totalDKP + kingdomData.totalDKP;
        campData.totalKillPoints = (campData.totalKillPoints || 0) - previousKingdomData.totalKillPoints + kingdomData.totalKillPoints;
        campData.playerCount = (campData.playerCount || 0) - previousKingdomData.playerCount + kingdomData.playerCount;
        
        // Store this kingdom's contribution
        campData.kingdoms[kingdomData.kdNumber] = {
            totalT4: kingdomData.totalT4,
            totalT5: kingdomData.totalT5,
            totalDeaths: kingdomData.totalDeaths,
            totalHealed: kingdomData.totalHealed,
            totalDKP: kingdomData.totalDKP,
            totalKillPoints: kingdomData.totalKillPoints,
            playerCount: kingdomData.playerCount
        };
        
        campData.camp = camp;
        campData.eventName = eventName;
        campData.kingdomCount = Object.keys(campData.kingdoms).length;
        campData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
        
        await campRef.set(campData);
        console.log(`Successfully updated camp aggregates for ${camp}`);
    }

    // Update cumulative aggregates
    async updateCumulativeAggregates(kdNumber, camp, eventData) {
        console.log('Updating cumulative aggregates for KD', kdNumber);
        
        // Update cumulative kingdom data
        const cumulativeKingdomRef = this.db
            .collection('aggregates')
            .doc('cumulative')
            .collection('kingdoms')
            .doc(kdNumber.toString());
        
        const kingdomDoc = await cumulativeKingdomRef.get();
        let cumulativeData = kingdomDoc.exists ? kingdomDoc.data() : {
            kdNumber: kdNumber,
            camp: camp,
            events: {},
            totalT4: 0,
            totalT5: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalDKP: 0,
            totalKillPoints: 0,
            playerCount: 0
        };
        
        // Ensure events object exists (for backward compatibility)
        if (!cumulativeData.events) {
            cumulativeData.events = {};
        }
        
        console.log('Current cumulative data has events:', Object.keys(cumulativeData.events));
        
        // Check if this event was already counted
        const previousEventData = cumulativeData.events[eventData.eventName] || this.getEmptyKingdomData();
        
        // Update cumulative totals
        cumulativeData.totalT4 = (cumulativeData.totalT4 || 0) - previousEventData.totalT4 + eventData.totalT4;
        cumulativeData.totalT5 = (cumulativeData.totalT5 || 0) - previousEventData.totalT5 + eventData.totalT5;
        cumulativeData.totalDeaths = (cumulativeData.totalDeaths || 0) - previousEventData.totalDeaths + eventData.totalDeaths;
        cumulativeData.totalHealed = (cumulativeData.totalHealed || 0) - previousEventData.totalHealed + eventData.totalHealed;
        cumulativeData.totalDKP = (cumulativeData.totalDKP || 0) - previousEventData.totalDKP + eventData.totalDKP;
        cumulativeData.totalKillPoints = (cumulativeData.totalKillPoints || 0) - previousEventData.totalKillPoints + eventData.totalKillPoints;
        
        // Store this event's contribution
        cumulativeData.events[eventData.eventName] = {
            totalT4: eventData.totalT4,
            totalT5: eventData.totalT5,
            totalDeaths: eventData.totalDeaths,
            totalHealed: eventData.totalHealed,
            totalDKP: eventData.totalDKP,
            totalKillPoints: eventData.totalKillPoints,
            playerCount: eventData.playerCount
        };
        
        cumulativeData.eventCount = Object.keys(cumulativeData.events).length;
        cumulativeData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
        
        await cumulativeKingdomRef.set(cumulativeData);
        console.log(`Successfully updated cumulative kingdom data for KD ${kdNumber}`);
        
        // Update cumulative camp data
        await this.updateCumulativeCampData(camp);
        console.log(`Successfully updated cumulative aggregates for KD ${kdNumber}`);
    }

    // Update cumulative camp data
    async updateCumulativeCampData(camp) {
        const cumulativeCampRef = this.db
            .collection('aggregates')
            .doc('cumulative')
            .collection('camps')
            .doc(camp);
        
        // Get all kingdoms in this camp
        const kingdomNumbers = this.camps[camp];
        let campTotals = {
            camp: camp,
            totalT4: 0,
            totalT5: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalDKP: 0,
            totalKillPoints: 0,
            playerCount: 0,
            kingdomCount: 0
        };
        
        // Sum up all kingdoms in this camp
        for (const kdNumber of kingdomNumbers) {
            const kdDoc = await this.db
                .collection('aggregates')
                .doc('cumulative')
                .collection('kingdoms')
                .doc(kdNumber.toString())
                .get();
            
            if (kdDoc.exists) {
                const kdData = kdDoc.data();
                campTotals.totalT4 += kdData.totalT4 || 0;
                campTotals.totalT5 += kdData.totalT5 || 0;
                campTotals.totalDeaths += kdData.totalDeaths || 0;
                campTotals.totalHealed += kdData.totalHealed || 0;
                campTotals.totalDKP += kdData.totalDKP || 0;
                campTotals.totalKillPoints += kdData.totalKillPoints || 0;
                campTotals.playerCount += kdData.playerCount || 0;
                campTotals.kingdomCount++;
            }
        }
        
        campTotals.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
        await cumulativeCampRef.set(campTotals);
        console.log(`Successfully updated cumulative camp data for ${camp}`);
    }

    // DKP Calculation Functions
    calculatePlayerDKP(player) {
        const t4Points = (player.t4Kills || 0) * 5;
        const t5Points = (player.t5Kills || 0) * 10;
        const deathPoints = (player.deaths || 0) * 15;
        return t4Points + t5Points + deathPoints;
    }

    calculateTotalDKP(totalT4, totalT5, totalDeaths) {
        return (totalT4 * 5) + (totalT5 * 10) + (totalDeaths * 15);
    }

    // Removed calculateKP function - now using game's official Kill Points directly

    // Helper functions
    getEmptyCampData(camp, eventName) {
        return {
            camp: camp,
            eventName: eventName,
            totalT4: 0,
            totalT5: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalDKP: 0,
            totalKillPoints: 0,
            playerCount: 0,
            kingdomCount: 0,
            kingdoms: {}
        };
    }

    getEmptyKingdomData() {
        return {
            totalT4: 0,
            totalT5: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalDKP: 0,
            totalKillPoints: 0,
            playerCount: 0
        };
    }
}

// Export for use
window.DataProcessor = DataProcessor;