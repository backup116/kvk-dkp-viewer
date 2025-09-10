// Data Retriever - Optimized data fetching with caching
class DataRetriever {
    constructor() {
        this.db = firebase.firestore();
        this.memoryCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.camps = ['Fire', 'Earth', 'Water', 'Wind'];
        this.campKingdoms = {
            "Fire": [1400, 1068, 1471, 2162, 2197, 1520],
            "Earth": [1244, 1694, 2944, 3590, 2546, 1014],
            "Water": [3554, 1896, 1569, 3152, 3596, 2711, 1267],
            "Wind": [2352, 2973, 1477, 1294, 1732, 2509, 1359]
        };
    }

    // Main function to get all view data
    async getViewData(eventFilter = 'cumulative') {
        const cacheKey = `view_${eventFilter}`;
        
        // Check memory cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('Returning cached data for:', cacheKey);
            return cached;
        }
        
        console.log('Fetching fresh data for:', eventFilter);
        
        try {
            // Parallel fetch all required data
            const [campData, kingdomData, playerData] = await Promise.all([
                this.getCampPerformance(eventFilter),
                this.getKingdomPerformance(eventFilter),
                this.getTopPlayers(eventFilter, 100)
            ]);
            
            const viewData = {
                camps: campData,
                kingdoms: kingdomData,
                players: playerData,
                event: eventFilter,
                timestamp: Date.now()
            };
            
            // Cache the result
            this.setCache(cacheKey, viewData);
            
            return viewData;
        } catch (error) {
            console.error('Error fetching view data:', error);
            throw error;
        }
    }

    // Get camp performance data - OPTIMIZED
    async getCampPerformance(eventFilter) {
        const campData = [];
        
        if (eventFilter === 'cumulative') {
            // Get all cumulative camp data in a single query
            try {
                const snapshot = await this.db
                    .collection('aggregates')
                    .doc('cumulative')
                    .collection('camps')
                    .get();
                
                // Create a map for quick lookup
                const dataMap = new Map();
                snapshot.forEach(doc => {
                    dataMap.set(doc.id, doc.data());
                });
                
                // Build result array in correct order
                for (const camp of this.camps) {
                    if (dataMap.has(camp)) {
                        campData.push({
                            camp: camp,
                            ...dataMap.get(camp)
                        });
                    } else {
                        campData.push(this.getEmptyCampData(camp));
                    }
                }
            } catch (error) {
                console.error('Error fetching camp data:', error);
                // Return empty data for all camps
                return this.camps.map(camp => this.getEmptyCampData(camp));
            }
        } else {
            // For specific events, still need individual queries but optimize
            const campPromises = this.camps.map(camp => 
                this.db
                    .collection('aggregates')
                    .doc('camps')
                    .collection(camp)
                    .doc(eventFilter)
                    .get()
            );
            
            const campDocs = await Promise.all(campPromises);
            
            return campDocs.map((doc, index) => {
                if (doc.exists) {
                    return {
                        camp: this.camps[index],
                        ...doc.data()
                    };
                } else {
                    return this.getEmptyCampData(this.camps[index]);
                }
            });
        }
        
        return campData;
    }

    // Get kingdom performance data - OPTIMIZED
    async getKingdomPerformance(eventFilter, keepCampsTogether = true) {
        const allKingdoms = [];
        
        if (eventFilter === 'cumulative') {
            // Get ALL cumulative kingdom data in a SINGLE query
            try {
                const snapshot = await this.db
                    .collection('aggregates')
                    .doc('cumulative')
                    .collection('kingdoms')
                    .get();
                
                // Create a map for quick lookup
                const dataMap = new Map();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    dataMap.set(parseInt(doc.id), {
                        kdNumber: parseInt(doc.id),
                        ...data
                    });
                });
                
                // Build result array with all kingdoms
                for (const [camp, kingdomNumbers] of Object.entries(this.campKingdoms)) {
                    for (const kdNumber of kingdomNumbers) {
                        if (dataMap.has(kdNumber)) {
                            const data = dataMap.get(kdNumber);
                            allKingdoms.push({
                                ...data,
                                camp: data.camp || camp // Use stored camp or fallback
                            });
                        } else {
                            allKingdoms.push(this.getEmptyKingdomData(kdNumber, camp));
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching kingdom data:', error);
                // Return empty data for all kingdoms
                for (const [camp, kingdomNumbers] of Object.entries(this.campKingdoms)) {
                    for (const kdNumber of kingdomNumbers) {
                        allKingdoms.push(this.getEmptyKingdomData(kdNumber, camp));
                    }
                }
            }
        } else {
            // Get specific event data - batch queries by camp to reduce requests
            const promises = [];
            
            for (const camp of this.camps) {
                const kingdomNumbers = this.campKingdoms[camp];
                
                // Batch all kingdoms in a camp together
                const campPromise = Promise.all(
                    kingdomNumbers.map(kdNumber =>
                        this.db
                            .collection('aggregates')
                            .doc('kingdoms')
                            .collection(kdNumber.toString())
                            .doc(eventFilter)
                            .get()
                    )
                ).then(docs => {
                    return docs.map((doc, index) => {
                        if (doc.exists) {
                            return {
                                kdNumber: kingdomNumbers[index],
                                camp: camp,
                                ...doc.data()
                            };
                        } else {
                            return this.getEmptyKingdomData(kingdomNumbers[index], camp);
                        }
                    });
                });
                
                promises.push(campPromise);
            }
            
            // Execute all camp queries in parallel
            const results = await Promise.all(promises);
            results.forEach(campResults => {
                allKingdoms.push(...campResults);
            });
        }
        
        // Sort kingdoms
        if (keepCampsTogether) {
            // Sort by camp first, then by DKP within each camp
            allKingdoms.sort((a, b) => {
                if (a.camp !== b.camp) {
                    return this.camps.indexOf(a.camp) - this.camps.indexOf(b.camp);
                }
                return (b.totalDKP || 0) - (a.totalDKP || 0);
            });
        } else {
            // Sort by DKP only
            allKingdoms.sort((a, b) => (b.totalDKP || 0) - (a.totalDKP || 0));
        }
        
        return allKingdoms;
    }

    // Get top players
    async getTopPlayers(eventFilter, limit = 100) {
        const allPlayers = [];
        
        if (eventFilter === 'cumulative') {
            // For cumulative, we need to aggregate player data across all events
            // This is more complex, so for now, let's get the latest event data
            const events = ['Pass 4*', 'Altar of darkness', 'Pass 7', 'Pass 8', 'Great ziggurat'];
            
            // Get player data from the most recent event with data
            for (const event of events.reverse()) {
                const playersSnapshot = await this.db
                    .collectionGroup('players')
                    .where('eventName', '==', event)
                    .orderBy('dkp', 'desc')
                    .limit(limit)
                    .get();
                
                if (!playersSnapshot.empty) {
                    playersSnapshot.forEach(doc => {
                        allPlayers.push(doc.data());
                    });
                    break;
                }
            }
        } else {
            // Get players for specific event
            const playersSnapshot = await this.db
                .collectionGroup('players')
                .where('eventName', '==', eventFilter)
                .orderBy('dkp', 'desc')
                .limit(limit)
                .get();
            
            playersSnapshot.forEach(doc => {
                allPlayers.push(doc.data());
            });
        }
        
        return allPlayers;
    }

    // Get specific kingdom details
    async getKingdomDetails(kdNumber, eventFilter = 'cumulative') {
        const cacheKey = `kingdom_${kdNumber}_${eventFilter}`;
        
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        let kingdomData;
        let players = [];
        
        if (eventFilter === 'cumulative') {
            // Get cumulative kingdom data
            const kdDoc = await this.db
                .collection('aggregates')
                .doc('cumulative')
                .collection('kingdoms')
                .doc(kdNumber.toString())
                .get();
            
            kingdomData = kdDoc.exists ? kdDoc.data() : this.getEmptyKingdomData(kdNumber);
            
            // Get all players across all events for this kingdom
            const events = ['Pass 4*', 'Altar of darkness', 'Pass 7', 'Pass 8', 'Great ziggurat'];
            const playerMap = new Map();
            
            for (const event of events) {
                const playersSnapshot = await this.db
                    .collection('events')
                    .doc(event)
                    .collection('kingdoms')
                    .doc(kdNumber.toString())
                    .collection('players')
                    .get();
                
                playersSnapshot.forEach(doc => {
                    const playerData = doc.data();
                    const existingPlayer = playerMap.get(playerData.playerId);
                    
                    if (existingPlayer) {
                        // Aggregate player data
                        existingPlayer.t4Kills += playerData.t4Kills || 0;
                        existingPlayer.t5Kills += playerData.t5Kills || 0;
                        existingPlayer.deaths += playerData.deaths || 0;
                        existingPlayer.healed += playerData.healed || 0;
                        existingPlayer.dkp += playerData.dkp || 0;
                        existingPlayer.killPoints += playerData.killPoints || 0;
                    } else {
                        playerMap.set(playerData.playerId, { ...playerData });
                    }
                });
            }
            
            players = Array.from(playerMap.values());
        } else {
            // Get specific event data
            const kdDoc = await this.db
                .collection('aggregates')
                .doc('kingdoms')
                .collection(kdNumber.toString())
                .doc(eventFilter)
                .get();
            
            kingdomData = kdDoc.exists ? kdDoc.data() : this.getEmptyKingdomData(kdNumber);
            
            // Get players for this event
            const playersSnapshot = await this.db
                .collection('events')
                .doc(eventFilter)
                .collection('kingdoms')
                .doc(kdNumber.toString())
                .collection('players')
                .orderBy('dkp', 'desc')
                .get();
            
            playersSnapshot.forEach(doc => {
                players.push(doc.data());
            });
        }
        
        const result = {
            kingdom: kingdomData,
            players: players.sort((a, b) => (b.dkp || 0) - (a.dkp || 0))
        };
        
        this.setCache(cacheKey, result);
        return result;
    }

    // Get camp comparison data
    async getCampComparison(eventFilter = 'cumulative') {
        const campData = await this.getCampPerformance(eventFilter);
        
        // Calculate relative percentages for visualization
        const maxValues = {
            t4: Math.max(...campData.map(c => c.totalT4 || 0)),
            t5: Math.max(...campData.map(c => c.totalT5 || 0)),
            deaths: Math.max(...campData.map(c => c.totalDeaths || 0)),
            healed: Math.max(...campData.map(c => c.totalHealed || 0)),
            dkp: Math.max(...campData.map(c => c.totalDKP || 0)),
            kp: Math.max(...campData.map(c => c.totalKillPoints || 0))
        };
        
        return campData.map(camp => ({
            ...camp,
            percentages: {
                t4: maxValues.t4 > 0 ? ((camp.totalT4 || 0) / maxValues.t4 * 100) : 0,
                t5: maxValues.t5 > 0 ? ((camp.totalT5 || 0) / maxValues.t5 * 100) : 0,
                deaths: maxValues.deaths > 0 ? ((camp.totalDeaths || 0) / maxValues.deaths * 100) : 0,
                healed: maxValues.healed > 0 ? ((camp.totalHealed || 0) / maxValues.healed * 100) : 0,
                dkp: maxValues.dkp > 0 ? ((camp.totalDKP || 0) / maxValues.dkp * 100) : 0,
                kp: maxValues.kp > 0 ? ((camp.totalKillPoints || 0) / maxValues.kp * 100) : 0
            }
        }));
    }

    // Cache management
    getFromCache(key) {
        const cached = this.memoryCache.get(key);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < this.cacheExpiry) {
                return cached.data;
            }
            this.memoryCache.delete(key);
        }
        
        // Also check localStorage for persistent cache
        const localCached = localStorage.getItem(`cache_${key}`);
        if (localCached) {
            try {
                const parsed = JSON.parse(localCached);
                const age = Date.now() - parsed.timestamp;
                if (age < this.cacheExpiry) {
                    // Restore to memory cache
                    this.memoryCache.set(key, parsed);
                    return parsed.data;
                }
                localStorage.removeItem(`cache_${key}`);
            } catch (e) {
                console.error('Error parsing cached data:', e);
            }
        }
        
        return null;
    }

    setCache(key, data) {
        const cacheEntry = {
            data: data,
            timestamp: Date.now()
        };
        
        // Store in memory
        this.memoryCache.set(key, cacheEntry);
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
        } catch (e) {
            console.warn('Failed to cache in localStorage:', e);
        }
    }

    clearCache() {
        this.memoryCache.clear();
        
        // Clear localStorage cache
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Helper functions
    getEmptyCampData(camp) {
        return {
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
    }

    getEmptyKingdomData(kdNumber, camp) {
        return {
            kdNumber: kdNumber,
            camp: camp || '',
            totalT4: 0,
            totalT5: 0,
            totalDeaths: 0,
            totalHealed: 0,
            totalDKP: 0,
            totalKillPoints: 0,
            playerCount: 0
        };
    }

    // Format numbers for display
    formatNumber(num) {
        if (num >= 1e9) {
            return (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Export for use
window.DataRetriever = DataRetriever;