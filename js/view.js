// View page functionality - Analytics Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data retriever with singleton pattern
    if (!window.dataRetriever) {
        window.dataRetriever = new DataRetriever();
    }
    const dataRetriever = window.dataRetriever;
    let currentEvent = 'cumulative';
    let isLoading = false; // Prevent multiple simultaneous loads
    
    // Initialize the dashboard
    initializeDashboard();
    
    async function initializeDashboard() {
        // Setup event filter
        setupEventFilter();
        
        // Load initial data only once
        if (!isLoading) {
            await loadDashboardData(currentEvent);
        }
        
        // Setup refresh button
        setupRefreshButton();
    }
    
    // Setup event filter dropdown
    function setupEventFilter() {
        const eventFilter = document.getElementById('eventFilter');
        if (!eventFilter) return;
        
        eventFilter.addEventListener('change', async (e) => {
            currentEvent = e.target.value;
            await loadDashboardData(currentEvent);
        });
    }
    
    // Setup refresh button
    function setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (!refreshBtn) return;
        
        refreshBtn.addEventListener('click', async () => {
            // Clear cache and reload
            dataRetriever.clearCache();
            await loadDashboardData(currentEvent);
        });
    }
    
    // Main function to load all dashboard data
    async function loadDashboardData(eventFilter) {
        // Prevent multiple simultaneous loads
        if (isLoading) {
            console.log('Already loading data, skipping...');
            return;
        }
        
        isLoading = true;
        
        try {
            showLoadingState();
            
            console.log(`Loading data for event: ${eventFilter}`);
            
            // Fetch all data (cached automatically by DataRetriever)
            const viewData = await dataRetriever.getViewData(eventFilter);
            
            console.log('Data loaded, updating UI...');
            
            // Update UI components
            updateCampPerformance(viewData.camps);
            updateKingdomPerformance(viewData.kingdoms);
            updatePlayerStats(viewData.players);
            updateLastUpdated();
            
            hideLoadingState();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showErrorState(error.message);
        } finally {
            isLoading = false;
        }
    }
    
    // Update camp performance cards
    function updateCampPerformance(camps) {
        const container = document.getElementById('campCards');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Calculate max values for percentage calculations
        const maxDKP = Math.max(...camps.map(c => c.totalDKP || 0));
        const maxKP = Math.max(...camps.map(c => c.totalKillPoints || 0));
        
        camps.forEach(camp => {
            const card = createCampCard(camp, maxDKP, maxKP);
            container.appendChild(card);
        });
    }
    
    // Create individual camp card
    function createCampCard(camp, maxDKP, maxKP) {
        const card = document.createElement('div');
        card.className = `camp-card ${camp.camp.toLowerCase()}`;
        
        const dkpPercent = maxDKP > 0 ? (camp.totalDKP / maxDKP * 100) : 0;
        const kpPercent = maxKP > 0 ? (camp.totalKillPoints / maxKP * 100) : 0;
        
        card.innerHTML = `
            <h3>${getCampIcon(camp.camp)} ${camp.camp} Camp</h3>
            <div class="camp-stats">
                <div class="stat-row">
                    <span>Total DKP:</span>
                    <span class="stat-value">${formatNumber(camp.totalDKP || 0)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill dkp" style="width: ${dkpPercent}%"></div>
                </div>
                
                <div class="stat-row">
                    <span>Kill Points:</span>
                    <span class="stat-value">${formatNumber(camp.totalKillPoints || 0)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill kp" style="width: ${kpPercent}%"></div>
                </div>
                
                <div class="stat-row">
                    <span>T5 Kills:</span>
                    <span class="stat-value">${formatNumber(camp.totalT5 || 0)}</span>
                </div>
                
                <div class="stat-row">
                    <span>T4 Kills:</span>
                    <span class="stat-value">${formatNumber(camp.totalT4 || 0)}</span>
                </div>
                
                <div class="stat-row">
                    <span>Deaths:</span>
                    <span class="stat-value">${formatNumber(camp.totalDeaths || 0)}</span>
                </div>
                
                <div class="stat-row">
                    <span>Healed:</span>
                    <span class="stat-value">${formatNumber(camp.totalHealed || 0)}</span>
                </div>
                
                <div class="stat-row">
                    <span>Players:</span>
                    <span class="stat-value">${camp.playerCount || 0}</span>
                </div>
                
                <div class="stat-row">
                    <span>Kingdoms:</span>
                    <span class="stat-value">${camp.kingdomCount || 0}</span>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Update kingdom performance table
    function updateKingdomPerformance(kingdoms) {
        const tbody = document.querySelector('#kingdomTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        kingdoms.forEach((kingdom, index) => {
            const row = document.createElement('tr');
            row.className = getCampClass(kingdom.camp);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <span class="kd-number">${kingdom.kdNumber}</span>
                    <span class="camp-badge ${kingdom.camp.toLowerCase()}">${kingdom.camp}</span>
                </td>
                <td>${formatNumber(kingdom.totalDKP || 0)}</td>
                <td>${formatNumber(kingdom.totalKillPoints || 0)}</td>
                <td>${formatNumber(kingdom.totalT5 || 0)}</td>
                <td>${formatNumber(kingdom.totalT4 || 0)}</td>
                <td>${formatNumber(kingdom.totalDeaths || 0)}</td>
                <td>${formatNumber(kingdom.totalHealed || 0)}</td>
                <td>${kingdom.playerCount || 0}</td>
                <td>
                    <button class="view-details-btn" data-kd="${kingdom.kdNumber}">
                        View Details
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add click handlers for view details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const kdNumber = e.target.dataset.kd;
                showKingdomDetails(kdNumber);
            });
        });
    }
    
    // Update player stats table
    function updatePlayerStats(players) {
        const tbody = document.querySelector('#playerTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Show top 50 players
        players.slice(0, 50).forEach((player, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.playerName || 'Unknown'}</td>
                <td>${player.kdNumber || '-'}</td>
                <td>${formatNumber(player.dkp || 0)}</td>
                <td>${formatNumber(player.killPoints || 0)}</td>
                <td>${formatNumber(player.t5Kills || 0)}</td>
                <td>${formatNumber(player.t4Kills || 0)}</td>
                <td>${formatNumber(player.deaths || 0)}</td>
                <td>${formatNumber(player.healed || 0)}</td>
                <td>${formatNumber(player.power || 0)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Show kingdom details modal
    async function showKingdomDetails(kdNumber) {
        try {
            const details = await dataRetriever.getKingdomDetails(kdNumber, currentEvent);
            
            // Create modal content
            const modalHtml = `
                <div class="modal-overlay" id="kingdomModal">
                    <div class="modal-content kingdom-details">
                        <div class="modal-header">
                            <h2>Kingdom ${kdNumber} Details</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="kingdom-summary">
                                <h3>Kingdom Statistics</h3>
                                <div class="stats-grid">
                                    <div class="stat">
                                        <label>Total DKP:</label>
                                        <value>${formatNumber(details.kingdom.totalDKP || 0)}</value>
                                    </div>
                                    <div class="stat">
                                        <label>Kill Points:</label>
                                        <value>${formatNumber(details.kingdom.totalKillPoints || 0)}</value>
                                    </div>
                                    <div class="stat">
                                        <label>T5 Kills:</label>
                                        <value>${formatNumber(details.kingdom.totalT5 || 0)}</value>
                                    </div>
                                    <div class="stat">
                                        <label>T4 Kills:</label>
                                        <value>${formatNumber(details.kingdom.totalT4 || 0)}</value>
                                    </div>
                                    <div class="stat">
                                        <label>Deaths:</label>
                                        <value>${formatNumber(details.kingdom.totalDeaths || 0)}</value>
                                    </div>
                                    <div class="stat">
                                        <label>Players:</label>
                                        <value>${details.kingdom.playerCount || 0}</value>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="kingdom-players">
                                <h3>Top Players</h3>
                                <table class="players-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Player</th>
                                            <th>DKP</th>
                                            <th>T5</th>
                                            <th>T4</th>
                                            <th>Deaths</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${details.players.slice(0, 20).map((p, i) => `
                                            <tr>
                                                <td>${i + 1}</td>
                                                <td>${p.playerName || 'Unknown'}</td>
                                                <td>${formatNumber(p.dkp || 0)}</td>
                                                <td>${formatNumber(p.t5Kills || 0)}</td>
                                                <td>${formatNumber(p.t4Kills || 0)}</td>
                                                <td>${formatNumber(p.deaths || 0)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add close handler
            const modal = document.getElementById('kingdomModal');
            const closeBtn = modal.querySelector('.close-modal');
            
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
        } catch (error) {
            console.error('Error loading kingdom details:', error);
            alert('Error loading kingdom details');
        }
    }
    
    // Update last updated timestamp
    function updateLastUpdated() {
        const element = document.getElementById('lastUpdated');
        if (!element) return;
        
        const now = new Date();
        element.textContent = `Last Updated: ${now.toLocaleString()}`;
    }
    
    // Show loading state
    function showLoadingState() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.display = 'flex';
        }
    }
    
    // Hide loading state
    function hideLoadingState() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    // Show error state
    function showErrorState(message) {
        hideLoadingState();
        alert(`Error: ${message}`);
    }
    
    // Helper functions
    function getCampIcon(camp) {
        const icons = {
            'Fire': '🔥',
            'Earth': '🌍',
            'Water': '💧',
            'Wind': '🌪️'
        };
        return icons[camp] || '';
    }
    
    function getCampClass(camp) {
        return camp ? camp.toLowerCase() : '';
    }
    
    function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        
        if (num >= 1e9) {
            return (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
});