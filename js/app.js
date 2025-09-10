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
            }
        }
    }, 30000);
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