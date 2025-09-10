// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC27aBZWEc8XvA3Td-4JMBuf9oQQoudFew",
    authDomain: "kvk-stats-tracker-d6c29.firebaseapp.com",
    projectId: "kvk-stats-tracker-d6c29",
    storageBucket: "kvk-stats-tracker-d6c29.firebasestorage.app",
    messagingSenderId: "1005757468612",
    appId: "1:1005757468612:web:5e987f434f559d15e8de91",
    measurementId: "G-KZXLLXZFE0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const storage = firebase.storage();

// Kingdom and Camp data
const CAMPS = {
    "Fire": [1400, 1068, 1471, 2162, 2197, 1520],
    "Earth": [1244, 1694, 2944, 3590, 2546, 1014],
    "Water": [3554, 1896, 1569, 3152, 3596, 2711, 1267],
    "Wind": [2352, 2973, 1477, 1294, 1732, 2509, 1359]
};

const EVENTS = [
    { event: "Pass 4*", date: "Thu, 11.9, 7:04" },
    { event: "Altar of darkness", date: "Tue, 23.9, 7:04" },
    { event: "Pass 7", date: "Fri, 3.10, 7:04" },
    { event: "Pass 8", date: "Mon, 6.10, 7:04" },
    { event: "Great ziggurat", date: "Sun, 12.10, 7:04" }
];

// Helper function to get camp for a kingdom
function getCampForKingdom(kd) {
    for (const [camp, kingdoms] of Object.entries(CAMPS)) {
        if (kingdoms.includes(parseInt(kd))) {
            return camp;
        }
    }
    return null;
}

// Database operations
class DatabaseManager {
    constructor() {
        this.db = db;
        this.storage = storage;
    }

    // Save kingdom data (updated for single file)
    async saveKingdomData(kdNumber, eventName, eventData, afterData, dkpCalculation) {
        try {
            const camp = getCampForKingdom(kdNumber);
            const docRef = db.collection('kingdoms').doc(kdNumber.toString());
            
            await docRef.set({
                kdNumber: kdNumber,
                camp: camp,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Save event data (single file containing event scores)
            await docRef.collection('events').doc(eventName).set({
                eventData: eventData,  // Single file with event scores
                dkpCalculation: dkpCalculation,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update total DKP
            await this.updateTotalDKP(kdNumber);
            
            return true;
        } catch (error) {
            console.error('Error saving kingdom data:', error);
            return false;
        }
    }

    // Calculate and update total DKP for a kingdom
    async updateTotalDKP(kdNumber) {
        try {
            const eventsSnapshot = await db.collection('kingdoms')
                .doc(kdNumber.toString())
                .collection('events')
                .get();
            
            let totalDKP = 0;
            let totalT5Kills = 0;
            let totalT4Kills = 0;
            let totalDeaths = 0;

            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.dkpCalculation) {
                    totalDKP += data.dkpCalculation.totalDKP || 0;
                    totalT5Kills += data.dkpCalculation.t5Kills || 0;
                    totalT4Kills += data.dkpCalculation.t4Kills || 0;
                    totalDeaths += data.dkpCalculation.deaths || 0;
                }
            });

            await db.collection('kingdoms').doc(kdNumber.toString()).update({
                totalDKP: totalDKP,
                totalT5Kills: totalT5Kills,
                totalT4Kills: totalT4Kills,
                totalDeaths: totalDeaths
            });

            return totalDKP;
        } catch (error) {
            console.error('Error updating total DKP:', error);
            return 0;
        }
    }

    // Get all kingdoms data
    async getAllKingdoms() {
        try {
            const snapshot = await db.collection('kingdoms').get();
            const kingdoms = [];
            
            snapshot.forEach(doc => {
                kingdoms.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return kingdoms;
        } catch (error) {
            console.error('Error getting kingdoms:', error);
            return [];
        }
    }

    // Get kingdom event data
    async getKingdomEvents(kdNumber) {
        try {
            const snapshot = await db.collection('kingdoms')
                .doc(kdNumber.toString())
                .collection('events')
                .get();
            
            const events = {};
            snapshot.forEach(doc => {
                events[doc.id] = doc.data();
            });
            
            return events;
        } catch (error) {
            console.error('Error getting kingdom events:', error);
            return {};
        }
    }

    // Get rankings with filters
    async getRankings(eventFilter = 'all', campFilter = 'all') {
        try {
            let query = db.collection('kingdoms');
            
            if (campFilter !== 'all') {
                query = query.where('camp', '==', campFilter);
            }
            
            const snapshot = await query.get();
            const rankings = [];
            
            for (const doc of snapshot.docs) {
                const kingdomData = doc.data();
                let dkpToUse = 0;
                let t5Kills = 0;
                let t4Kills = 0;
                let deaths = 0;
                
                if (eventFilter === 'all') {
                    dkpToUse = kingdomData.totalDKP || 0;
                    t5Kills = kingdomData.totalT5Kills || 0;
                    t4Kills = kingdomData.totalT4Kills || 0;
                    deaths = kingdomData.totalDeaths || 0;
                } else {
                    const eventData = await this.getKingdomEventData(doc.id, eventFilter);
                    if (eventData && eventData.dkpCalculation) {
                        dkpToUse = eventData.dkpCalculation.totalDKP || 0;
                        t5Kills = eventData.dkpCalculation.t5Kills || 0;
                        t4Kills = eventData.dkpCalculation.t4Kills || 0;
                        deaths = eventData.dkpCalculation.deaths || 0;
                    }
                }
                
                rankings.push({
                    kdNumber: doc.id,
                    camp: kingdomData.camp,
                    totalDKP: dkpToUse,
                    t5Kills: t5Kills,
                    t4Kills: t4Kills,
                    deaths: deaths
                });
            }
            
            // Sort by DKP descending
            rankings.sort((a, b) => b.totalDKP - a.totalDKP);
            
            return rankings;
        } catch (error) {
            console.error('Error getting rankings:', error);
            return [];
        }
    }

    // Get single kingdom event data
    async getKingdomEventData(kdNumber, eventName) {
        try {
            const doc = await db.collection('kingdoms')
                .doc(kdNumber.toString())
                .collection('events')
                .doc(eventName)
                .get();
            
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting kingdom event data:', error);
            return null;
        }
    }

    // Get camp statistics
    async getCampStatistics() {
        try {
            const kingdoms = await this.getAllKingdoms();
            const campStats = {};
            
            for (const [camp, kdList] of Object.entries(CAMPS)) {
                campStats[camp] = {
                    totalDKP: 0,
                    kingdoms: kdList,
                    avgDKP: 0,
                    t5Kills: 0,
                    t4Kills: 0,
                    deaths: 0
                };
                
                const campKingdoms = kingdoms.filter(k => k.camp === camp);
                campKingdoms.forEach(k => {
                    campStats[camp].totalDKP += k.totalDKP || 0;
                    campStats[camp].t5Kills += k.totalT5Kills || 0;
                    campStats[camp].t4Kills += k.totalT4Kills || 0;
                    campStats[camp].deaths += k.totalDeaths || 0;
                });
                
                campStats[camp].avgDKP = Math.round(campStats[camp].totalDKP / kdList.length);
            }
            
            return campStats;
        } catch (error) {
            console.error('Error getting camp statistics:', error);
            return {};
        }
    }

    // Check upload status for all kingdoms - OPTIMIZED
    async getUploadStatus() {
        try {
            const status = {};
            
            // Get all kingdom cumulative data in a single query
            const snapshot = await this.db
                .collection('aggregates')
                .doc('cumulative')
                .collection('kingdoms')
                .get();
            
            // Create a map of kingdoms with data
            const kingdomsWithData = new Map();
            snapshot.forEach(doc => {
                const data = doc.data();
                const kdNumber = parseInt(doc.id);
                const eventCount = data.eventCount || 0;
                
                if (eventCount === 0) {
                    kingdomsWithData.set(kdNumber, 'no-data');
                } else if (eventCount < EVENTS.length) {
                    kingdomsWithData.set(kdNumber, 'partial-data');
                } else {
                    kingdomsWithData.set(kdNumber, 'has-data');
                }
            });
            
            // Set status for all kingdoms
            for (const [camp, kingdoms] of Object.entries(CAMPS)) {
                for (const kd of kingdoms) {
                    status[kd] = kingdomsWithData.get(kd) || 'no-data';
                }
            }
            
            console.log('Upload status retrieved with 1 query instead of 25+');
            return status;
        } catch (error) {
            console.error('Error getting upload status:', error);
            return {};
        }
    }

    // Upload CSV backup to Firebase Storage
    async uploadCSVBackup(kdNumber, eventName, fileType, file) {
        try {
            const timestamp = Date.now();
            const fileName = `csv-backups/${kdNumber}/${eventName}/${fileType}_${timestamp}.csv`;
            const storageRef = storage.ref(fileName);
            
            await storageRef.put(file);
            const downloadURL = await storageRef.getDownloadURL();
            
            return downloadURL;
        } catch (error) {
            console.error('Error uploading CSV backup:', error);
            return null;
        }
    }
}

// Create and export database manager instance
const dbManager = new DatabaseManager();
window.dbManager = dbManager;