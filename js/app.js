// Main application logic for public view
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    loadRankings();
    loadCampStatistics();
    setupFilters();
    setupEventListeners();
    handleUrlHash();
}

// Handle URL hash navigation
function handleUrlHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const navBtn = document.querySelector(`[data-view="${hash}"]`);
        if (navBtn) {
            navBtn.click();
        }
    }
}

// Navigation between views
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.dataset.view;
            
            // Update active button
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show target panel
            viewPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `${targetView}View`) {
                    panel.classList.add('active');
                }
            });
            
            // Load data for the view
            if (targetView === 'rankings') {
                loadRankings();
            } else if (targetView === 'camps') {
                loadCampStatistics();
            } else if (targetView === 'events') {
                loadEventLeaderboard();
            } else if (targetView === 'players') {
                loadPlayerStats();
            }
        });
    });
}

// Load and display rankings
async function loadRankings(eventFilter = 'all', campFilter = 'all') {
    const rankingsBody = document.getElementById('rankingsBody');
    rankingsBody.innerHTML = '<tr><td colspan="7" class="loading">Loading rankings...</td></tr>';
    
    try {
        const rankings = await dbManager.getRankings(eventFilter, campFilter);
        
        if (rankings.length === 0) {
            rankingsBody.innerHTML = '<tr><td colspan="7" class="loading">No data available</td></tr>';
            return;
        }
        
        rankingsBody.innerHTML = '';
        rankings.forEach((kingdom, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${kingdom.kdNumber}</td>
                <td>${getCampEmoji(kingdom.camp)} ${kingdom.camp}</td>
                <td>${formatNumber(kingdom.totalDKP)}</td>
                <td>${formatNumber(kingdom.t5Kills)}</td>
                <td>${formatNumber(kingdom.t4Kills)}</td>
                <td>${formatNumber(kingdom.deaths)}</td>
            `;
            rankingsBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading rankings:', error);
        rankingsBody.innerHTML = '<tr><td colspan="7" class="loading">Error loading data</td></tr>';
    }
}

// Load and display camp statistics
async function loadCampStatistics() {
    try {
        const campStats = await dbManager.getCampStatistics();
        
        // Update camp cards
        for (const [camp, stats] of Object.entries(campStats)) {
            const campLower = camp.toLowerCase();
            document.getElementById(`${campLower}DKP`).textContent = formatNumber(stats.totalDKP);
            document.getElementById(`${campLower}Avg`).textContent = formatNumber(stats.avgDKP);
        }
        
        // Create camp comparison chart
        const ctx = document.getElementById('campChart');
        if (ctx) {
            // Destroy existing chart if it exists
            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(campStats).map(camp => `${getCampEmoji(camp)} ${camp}`),
                    datasets: [{
                        label: 'Total DKP',
                        data: Object.values(campStats).map(stats => stats.totalDKP),
                        backgroundColor: [
                            'rgba(255, 107, 107, 0.8)',
                            'rgba(139, 115, 85, 0.8)',
                            'rgba(78, 205, 196, 0.8)',
                            'rgba(149, 175, 192, 0.8)'
                        ],
                        borderColor: [
                            'rgba(255, 107, 107, 1)',
                            'rgba(139, 115, 85, 1)',
                            'rgba(78, 205, 196, 1)',
                            'rgba(149, 175, 192, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Total DKP by Camp'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading camp statistics:', error);
    }
}

// Load event-specific leaderboard
async function loadEventLeaderboard() {
    const eventSelect = document.getElementById('eventSelect');
    const leaderboardBody = document.getElementById('eventLeaderboard');
    
    if (!eventSelect || !leaderboardBody) return;
    
    const selectedEvent = eventSelect.value;
    leaderboardBody.innerHTML = '<tr><td colspan="7" class="loading">Loading event data...</td></tr>';
    
    try {
        const rankings = await dbManager.getRankings(selectedEvent, 'all');
        
        if (rankings.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="7" class="loading">No data for this event</td></tr>';
            return;
        }
        
        leaderboardBody.innerHTML = '';
        rankings.forEach((kingdom, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${kingdom.kdNumber}</td>
                <td>${getCampEmoji(kingdom.camp)} ${kingdom.camp}</td>
                <td>${formatNumber(kingdom.totalDKP)}</td>
                <td>${formatNumber(kingdom.t5Kills)}</td>
                <td>${formatNumber(kingdom.t4Kills)}</td>
                <td>${formatNumber(kingdom.deaths)}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading event leaderboard:', error);
        leaderboardBody.innerHTML = '<tr><td colspan="7" class="loading">Error loading data</td></tr>';
    }
}

// Setup filter event listeners
function setupFilters() {
    const eventFilter = document.getElementById('eventFilter');
    const campFilter = document.getElementById('campFilter');
    
    if (eventFilter) {
        eventFilter.addEventListener('change', () => {
            loadRankings(eventFilter.value, campFilter.value);
        });
    }
    
    if (campFilter) {
        campFilter.addEventListener('change', () => {
            loadRankings(eventFilter.value, campFilter.value);
        });
    }
    
    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
        eventSelect.addEventListener('change', () => {
            loadEventLeaderboard();
        });
    }
    
    // Player view filters
    const playerEventFilter = document.getElementById('playerEventFilter');
    const playerKdFilter = document.getElementById('playerKdFilter');
    const playerCampFilter = document.getElementById('playerCampFilter');
    
    if (playerEventFilter) {
        playerEventFilter.addEventListener('change', () => {
            loadPlayerStats(playerEventFilter.value, playerKdFilter.value, playerCampFilter.value);
        });
    }
    
    if (playerKdFilter) {
        playerKdFilter.addEventListener('change', () => {
            loadPlayerStats(playerEventFilter.value, playerKdFilter.value, playerCampFilter.value);
        });
    }
    
    if (playerCampFilter) {
        playerCampFilter.addEventListener('change', () => {
            loadPlayerStats(playerEventFilter.value, playerKdFilter.value, playerCampFilter.value);
        });
    }
}

// Setup other event listeners
function setupEventListeners() {
    // Refresh data every 30 seconds
    setInterval(() => {
        const activePanel = document.querySelector('.view-panel.active');
        if (activePanel) {
            if (activePanel.id === 'rankingsView') {
                const eventFilter = document.getElementById('eventFilter').value;
                const campFilter = document.getElementById('campFilter').value;
                loadRankings(eventFilter, campFilter);
            } else if (activePanel.id === 'campsView') {
                loadCampStatistics();
            } else if (activePanel.id === 'eventsView') {
                loadEventLeaderboard();
            } else if (activePanel.id === 'playersView') {
                const playerEventFilter = document.getElementById('playerEventFilter').value;
                const playerKdFilter = document.getElementById('playerKdFilter').value;
                const playerCampFilter = document.getElementById('playerCampFilter').value;
                loadPlayerStats(playerEventFilter, playerKdFilter, playerCampFilter);
            }
        }
    }, 30000);
}

// Load and display player statistics
async function loadPlayerStats(eventFilter = 'cumulative', kdFilter = '', campFilter = '') {
    const playersBody = document.getElementById('playersBody');
    playersBody.innerHTML = '<tr><td colspan="11" class="loading">Loading player stats...</td></tr>';
    
    try {
        const db = firebase.firestore();
        let players = [];
        
        if (eventFilter === 'cumulative') {
            // Get cumulative player data from all events
            const playersSnapshot = await db.collectionGroup('players').get();
            
            // Group by playerId and aggregate
            const playerMap = new Map();
            
            playersSnapshot.forEach(doc => {
                const player = doc.data();
                const playerId = player.playerID || player.playerId || `${player.playerName}_${player.kdNumber}`;
                
                if (playerMap.has(playerId)) {
                    const existing = playerMap.get(playerId);
                    existing.dkp = (existing.dkp || 0) + (player.dkp || 0);
                    existing.killPoints = (existing.killPoints || 0) + (player.killPoints || 0);
                    existing.t5Kills = (existing.t5Kills || 0) + (player.t5Kills || 0);
                    existing.t4Kills = (existing.t4Kills || 0) + (player.t4Kills || 0);
                    existing.deaths = (existing.deaths || 0) + (player.deaths || 0);
                    existing.healed = (existing.healed || 0) + (player.healed || 0);
                    existing.power = Math.max(existing.power || 0, player.power || 0);
                } else {
                    playerMap.set(playerId, { ...player });
                }
            });
            
            players = Array.from(playerMap.values());
        } else {
            // Get players for specific event using collectionGroup
            // Since parent documents don't exist, we need to query players directly and filter
            console.log(`Getting players for specific event: "${eventFilter}"`);
            
            const playersSnapshot = await db.collectionGroup('players')
                .where('eventName', '==', eventFilter)
                .get();
            
            players = playersSnapshot.docs.map(doc => doc.data());
            console.log(`Found ${players.length} players for event "${eventFilter}"`);
        }
        
        // Apply filters
        if (kdFilter) {
            players = players.filter(p => p.kdNumber == kdFilter);
        }
        if (campFilter) {
            // Get camp for player's kingdom
            players = players.filter(p => {
                const camp = getKingdomCamp(p.kdNumber);
                return camp === campFilter;
            });
        }
        
        // Sort by DKP descending
        players.sort((a, b) => (b.dkp || 0) - (a.dkp || 0));
        
        // Update the table
        updatePlayersTable(players);
        
        // Populate KD filter options
        populateKdFilter(players);
        
    } catch (error) {
        console.error('Error loading player stats:', error);
        playersBody.innerHTML = '<tr><td colspan="11" class="loading">Error loading player stats</td></tr>';
    }
}

// Update the players table
function updatePlayersTable(players) {
    const playersBody = document.getElementById('playersBody');
    playersBody.innerHTML = '';
    
    if (players.length === 0) {
        playersBody.innerHTML = '<tr><td colspan="11" class="loading">No player data available</td></tr>';
        return;
    }
    
    players.slice(0, 100).forEach((player, index) => {
        const row = document.createElement('tr');
        const camp = getKingdomCamp(player.kdNumber);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.playerName || 'Unknown'}</td>
            <td>${player.kdNumber || '-'}</td>
            <td>${getCampEmoji(camp)} ${camp || 'Unknown'}</td>
            <td>${formatNumber(player.dkp || 0)}</td>
            <td>${formatNumber(player.killPoints || 0)}</td>
            <td>${formatNumber(player.t5Kills || 0)}</td>
            <td>${formatNumber(player.t4Kills || 0)}</td>
            <td>${formatNumber(player.deaths || 0)}</td>
            <td>${formatNumber(player.healed || 0)}</td>
            <td>${formatNumber(player.power || 0)}</td>
        `;
        
        playersBody.appendChild(row);
    });
}

// Populate KD filter dropdown
function populateKdFilter(players) {
    const kdFilter = document.getElementById('playerKdFilter');
    if (!kdFilter) return;
    
    const kds = [...new Set(players.map(p => p.kdNumber).filter(kd => kd))].sort((a, b) => a - b);
    
    kdFilter.innerHTML = '<option value="">All Kingdoms</option>';
    kds.forEach(kd => {
        const option = document.createElement('option');
        option.value = kd;
        option.textContent = `KD ${kd}`;
        kdFilter.appendChild(option);
    });
}

// Get kingdom camp
function getKingdomCamp(kdNumber) {
    const camps = {
        "Fire": [1400, 1068, 1471, 2162, 2197, 1520],
        "Earth": [1244, 1694, 2944, 3590, 2546, 1014],
        "Water": [3554, 1896, 1569, 3152, 3596, 2711, 1267],
        "Wind": [2352, 2973, 1477, 1294, 1732, 2509, 1359]
    };
    
    const kdNum = parseInt(kdNumber);
    for (const [camp, kingdoms] of Object.entries(camps)) {
        if (kingdoms.includes(kdNum)) {
            return camp;
        }
    }
    return null;
}

// Helper functions
function getCampEmoji(camp) {
    const emojis = {
        'Fire': '🔥',
        'Earth': '🌍',
        'Water': '💧',
        'Wind': '💨'
    };
    return emojis[camp] || '';
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

// Initialize mock data for demo (remove in production)
async function initializeMockData() {
    // This function would add some sample data to Firebase
    // Only use for testing/demo purposes
    console.log('App initialized. To add mock data, call initializeMockData() from console.');
}