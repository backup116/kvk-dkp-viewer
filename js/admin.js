// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!authManager.requireAuth()) {
        return;
    }
    
    // Initialize data retriever globally
    if (!window.dataRetriever) {
        window.dataRetriever = new DataRetriever();
    }
    
    // Hide Manage tab for limited users
    if (!authManager.canManageData()) {
        const manageTab = document.querySelector('[data-view="manage"]');
        if (manageTab) {
            manageTab.style.display = 'none';
        }
        
        // Also update admin status display to show permission level
        const adminStatus = document.querySelector('.admin-status');
        if (adminStatus) {
            adminStatus.textContent = 'Admin: Limited Access';
        }
    }
    
    initializeAdminDashboard();
});

let currentUploadKD = null;
let uploadModal = null;

function initializeAdminDashboard() {
    setupAdminNavigation();
    setupMapInteractions();
    setupUploadModal();
    loadUploadStatus();
    
    // Only setup manage actions for users with full permissions
    if (authManager.canManageData()) {
        setupManageActions();
    }
}

// Admin navigation
function setupAdminNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.dataset.view;
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            viewPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `${targetView}View`) {
                    panel.classList.add('active');
                }
            });
            
            // Load specific view data
            if (targetView === 'map') {
                loadUploadStatus();
            } else if (targetView === 'rankings') {
                loadRankings();
            } else if (targetView === 'players') {
                loadPlayerStats();
            } else if (targetView === 'analytics') {
                loadAnalytics();
            }
        });
    });
}

// Setup interactive map
function setupMapInteractions() {
    // Setup clickable KD labels - now works with percentage-based responsive positioning
    const kdLabels = document.querySelectorAll('.kd-label');
    
    kdLabels.forEach(label => {
        label.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const kdNumber = label.dataset.kd;
            const camp = label.dataset.camp;
            console.log(`Clicked KD ${kdNumber} from ${camp} camp`);
            openUploadModal(kdNumber);
        });
    });
}

// Load and display upload status on map - OPTIMIZED
async function loadUploadStatus() {
    try {
        // Check if we're on the map view
        const mapView = document.getElementById('mapView');
        if (!mapView || !mapView.classList.contains('active')) {
            console.log('Map view not active, skipping status load');
            return;
        }
        
        console.log('Loading upload status...');
        const status = await dbManager.getUploadStatus();
        
        // Update KD label colors based on status
        const kdLabels = document.querySelectorAll('.kd-label');
        kdLabels.forEach(label => {
            const kd = label.dataset.kd;
            const kdStatus = status[kd] || 'no-data';
            
            // Remove existing status classes
            label.classList.remove('has-data', 'partial-data', 'no-data');
            // Add appropriate status class
            label.classList.add(kdStatus);
        });
        
        console.log('Upload status loaded');
    } catch (error) {
        console.error('Error loading upload status:', error);
    }
}

// Setup upload modal
function setupUploadModal() {
    uploadModal = document.getElementById('uploadModal');
    const closeBtn = uploadModal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelUpload');
    const calculateBtn = document.getElementById('calculateBtn');
    
    // Close modal handlers
    closeBtn.addEventListener('click', closeUploadModal);
    cancelBtn.addEventListener('click', closeUploadModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            closeUploadModal();
        }
    });
    
    // Setup file upload zone (single file)
    setupFileUploadZone('event');
    
    // Setup event selector
    const eventSelect = document.getElementById('eventSelect');
    eventSelect.addEventListener('change', checkCalculateButton);
    
    // Calculate button
    calculateBtn.addEventListener('click', handleCalculateAndSave);
}

// Setup individual file upload zone
function setupFileUploadZone(type) {
    const dropArea = document.getElementById(`${type}Drop`);
    const fileInput = document.getElementById(`${type}File`);
    const statusDiv = document.getElementById(`${type}Status`);
    
    // Click to browse
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
    
    // Drag and drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        const fileName = file.name.toLowerCase();
        if (file && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv'))) {
            handleFileUpload(file);
        } else {
            alert('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
        }
    });
}

// Handle file upload (single event file)
async function handleFileUpload(file) {
    const statusDiv = document.getElementById('eventStatus');
    const fileName = file.name.toLowerCase();
    const fileType = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ? 'Excel' : 'CSV';
    
    statusDiv.innerHTML = `⏳ Processing ${fileType} file...`;
    statusDiv.className = 'upload-status';
    
    try {
        const data = await fileParser.parseFile(file);
        fileParser.setEventData(data);
        
        // Store the original file for backup
        window.currentUploadFile = file;
        
        statusDiv.innerHTML = `✅ Event data uploaded (${fileType})`;
        statusDiv.className = 'upload-status success';
        
        // Check if file is uploaded and event selected
        checkCalculateButton();
        
        // Show preview
        showDKPPreview();
    } catch (error) {
        console.error(`Error processing ${fileType} file:`, error);
        statusDiv.innerHTML = `❌ Error: ${error.message}`;
        statusDiv.className = 'upload-status error';
    }
}

// Check if calculate button should be enabled
function checkCalculateButton() {
    const calculateBtn = document.getElementById('calculateBtn');
    const eventSelect = document.getElementById('eventSelect');
    const uploadHint = document.getElementById('uploadHint');
    
    if (fileParser.eventData && eventSelect.value) {
        calculateBtn.disabled = false;
        if (uploadHint) {
            uploadHint.style.display = 'none';
        }
    } else {
        calculateBtn.disabled = true;
        if (uploadHint) {
            uploadHint.style.display = 'block';
            if (!fileParser.eventData && !eventSelect.value) {
                uploadHint.innerHTML = 'ℹ️ Select an event and upload a file to enable the save button';
            } else if (!eventSelect.value) {
                uploadHint.innerHTML = '⚠️ Please select an event from the dropdown';
            } else if (!fileParser.eventData) {
                uploadHint.innerHTML = '⚠️ Please upload an Excel/CSV file with event data';
            }
        }
    }
}

// Show DKP calculation preview
function showDKPPreview() {
    try {
        if (!fileParser.eventData) return;
        const calculation = fileParser.calculateDKP(fileParser.eventData);
        
        document.getElementById('t5Preview').textContent = formatNumber(calculation.t5Kills);
        document.getElementById('t5Points').textContent = formatNumber(calculation.t5Points);
        document.getElementById('t4Preview').textContent = formatNumber(calculation.t4Kills);
        document.getElementById('t4Points').textContent = formatNumber(calculation.t4Points);
        document.getElementById('deathsPreview').textContent = formatNumber(calculation.deaths);
        document.getElementById('deathPoints').textContent = formatNumber(calculation.deathPoints);
        document.getElementById('totalDKP').textContent = formatNumber(calculation.totalDKP);
        
        document.getElementById('dkpPreview').style.display = 'block';
    } catch (error) {
        console.error('Error calculating DKP preview:', error);
    }
}

// Handle calculate and save
async function handleCalculateAndSave() {
    const eventSelect = document.getElementById('eventSelect');
    const selectedEvent = eventSelect.value;
    
    if (!selectedEvent) {
        alert('Please select an event');
        return;
    }
    
    if (!fileParser.eventData) {
        alert('Please upload the event score Excel/CSV file');
        return;
    }
    
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.disabled = true;
    calculateBtn.textContent = 'Processing...';
    
    try {
        // Calculate DKP with new metrics
        const calculation = fileParser.calculateDKP(fileParser.eventData);
        
        // Save file backup to Firebase Storage if file exists
        let fileBackupUrl = null;
        let fileMetadata = null;
        
        if (window.currentUploadFile) {
            try {
                const timestamp = Date.now();
                const fileExt = window.currentUploadFile.name.split('.').pop();
                // Sanitize event name for filename (remove special characters)
                const sanitizedEvent = selectedEvent.replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `uploads/${currentUploadKD}/${sanitizedEvent}_${timestamp}.${fileExt}`;
                const storageRef = firebase.storage().ref(fileName);
                
                // Upload file to Firebase Storage
                const uploadTask = await storageRef.put(window.currentUploadFile);
                fileBackupUrl = await uploadTask.ref.getDownloadURL();
                
                // Prepare file metadata
                fileMetadata = {
                    originalName: window.currentUploadFile.name,
                    size: window.currentUploadFile.size,
                    type: window.currentUploadFile.type,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    downloadUrl: fileBackupUrl,
                    storagePath: fileName,
                    kdNumber: currentUploadKD,
                    event: selectedEvent,
                    fileExtension: fileExt,
                    timestamp: timestamp
                };
                
                // Save file metadata to Firestore
                await db.collection('file_uploads').add(fileMetadata);
                
                console.log('File backup saved:', fileName);
            } catch (backupError) {
                console.error('Error saving file backup:', backupError);
                // Continue with data processing even if backup fails
            }
        }
        
        // Initialize data processor
        const processor = new DataProcessor();
        
        // Process the upload with the new architecture
        console.log('Processing upload with:', {
            kdNumber: currentUploadKD,
            event: selectedEvent,
            hasData: !!fileParser.eventData,
            hasBackup: !!fileBackupUrl
        });
        
        const result = await processor.processEventUpload(
            currentUploadKD,
            selectedEvent,
            fileParser.eventData
        );
        
        if (result.success) {
            // Clear cache for this data
            if (window.dataRetriever) {
                window.dataRetriever.clearCache();
            }
            
            alert(`Data saved successfully!\n` +
                  `Total DKP: ${formatNumber(calculation.totalDKP)}\n` +
                  `Total KP: ${formatNumber(calculation.totalKP)}\n` +
                  `Players: ${calculation.playerCount}\n` +
                  `File backup: ${fileBackupUrl ? 'Saved' : 'Not saved'}`);
            
            // Clear the stored file reference
            window.currentUploadFile = null;
            
            closeUploadModal();
            loadUploadStatus(); // Refresh map status
        } else {
            throw new Error(result.message || 'Failed to save data');
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data: ' + (error.message || 'Unknown error'));
    } finally {
        calculateBtn.disabled = false;
        calculateBtn.textContent = 'Calculate & Save';
    }
}

// Open upload modal
function openUploadModal(kdNumber) {
    currentUploadKD = kdNumber;
    document.getElementById('uploadKD').textContent = kdNumber;
    
    // Reset form
    fileParser.reset();
    document.getElementById('eventSelect').value = '';
    document.getElementById('eventStatus').innerHTML = '';
    document.getElementById('dkpPreview').style.display = 'none';
    document.getElementById('calculateBtn').disabled = true;
    
    // Reset file input
    document.getElementById('eventFile').value = '';
    
    uploadModal.style.display = 'block';
}

// Close upload modal
function closeUploadModal() {
    uploadModal.style.display = 'none';
    currentUploadKD = null;
    fileParser.reset();
    window.currentUploadFile = null; // Clear file reference
}

// Store chart instances
let uploadStatusChart = null;
let dkpTrendsChart = null;

// Load rankings data
async function loadRankings() {
    try {
        const eventFilter = document.getElementById('rankingsEventFilter');
        const tbody = document.getElementById('rankingsTableBody');
        
        if (!eventFilter || !tbody) {
            console.error('Rankings elements not found');
            return;
        }
        
        // Setup event filter listener
        if (!eventFilter.hasListener) {
            eventFilter.addEventListener('change', loadRankings);
            eventFilter.hasListener = true;
        }
        
        // Setup refresh button
        const refreshBtn = document.getElementById('refreshRankings');
        if (refreshBtn && !refreshBtn.hasListener) {
            refreshBtn.addEventListener('click', () => {
                window.dataRetriever.clearCache();
                loadRankings();
            });
            refreshBtn.hasListener = true;
        }
        
        // Show loading state
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading rankings...</td></tr>';
        
        // Get current filter value
        const currentEvent = eventFilter.value || 'cumulative';
        
        // Fetch kingdom data
        const kingdoms = await window.dataRetriever.getKingdomPerformance(currentEvent, false); // false = sort by DKP only
        
        // Clear table
        tbody.innerHTML = '';
        
        // Populate table
        kingdoms.forEach((kingdom, index) => {
            const row = document.createElement('tr');
            
            // Add camp-specific class for styling
            if (kingdom.camp) {
                row.className = kingdom.camp.toLowerCase();
            }
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>KD ${kingdom.kdNumber}</strong></td>
                <td>
                    <span class="camp-badge ${(kingdom.camp || '').toLowerCase()}">
                        ${getCampIcon(kingdom.camp)} ${kingdom.camp || 'Unknown'}
                    </span>
                </td>
                <td>${formatNumber(kingdom.totalDKP || 0)}</td>
                <td>${formatNumber(kingdom.totalKillPoints || 0)}</td>
                <td>${formatNumber(kingdom.totalT5 || 0)}</td>
                <td>${formatNumber(kingdom.totalT4 || 0)}</td>
                <td>${formatNumber(kingdom.totalDeaths || 0)}</td>
                <td>${formatNumber(kingdom.totalHealed || 0)}</td>
                <td>${kingdom.playerCount || 0}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // If no data
        if (kingdoms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No data available</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading rankings:', error);
        const tbody = document.getElementById('rankingsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading rankings</td></tr>';
        }
    }
}

// Helper function to get camp icon
function getCampIcon(camp) {
    const icons = {
        'Fire': '🔥',
        'Earth': '🌍',
        'Water': '💧',
        'Wind': '🌪️'
    };
    return icons[camp] || '';
}


// Load player statistics
async function loadPlayerStats() {
    try {
        const tbody = document.getElementById('playersTableBody');
        const eventFilter = document.getElementById('playerEventFilter');
        const kdFilter = document.getElementById('playerKdFilter');
        const campFilter = document.getElementById('playerCampFilter');
        const refreshBtn = document.getElementById('refreshPlayerStats');
        
        // Setup event listeners if not already set
        if (eventFilter && !eventFilter.hasListener) {
            eventFilter.addEventListener('change', () => loadPlayerStats());
            eventFilter.hasListener = true;
        }
        
        if (kdFilter && !kdFilter.hasListener) {
            kdFilter.addEventListener('change', () => loadPlayerStats());
            kdFilter.hasListener = true;
        }
        
        if (campFilter && !campFilter.hasListener) {
            campFilter.addEventListener('change', () => loadPlayerStats());
            campFilter.hasListener = true;
        }
        
        if (refreshBtn && !refreshBtn.hasListener) {
            refreshBtn.addEventListener('click', () => {
                if (window.dataRetriever) {
                    window.dataRetriever.clearCache();
                }
                loadPlayerStats();
            });
            refreshBtn.hasListener = true;
        }
        
        // Show loading state
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Loading player stats...</td></tr>';
        }
        
        // Get filter values
        const selectedEvent = eventFilter ? eventFilter.value : 'cumulative';
        const selectedKd = kdFilter ? kdFilter.value : 'all';
        const selectedCamp = campFilter ? campFilter.value : 'all';
        
        // Fetch player data
        if (window.dataRetriever) {
            const players = await window.dataRetriever.getPlayerStats(selectedEvent, selectedKd, selectedCamp);
            
            // Update kingdom dropdown if needed
            if (kdFilter && kdFilter.options.length <= 1) {
                const kingdoms = await window.dataRetriever.getAllKingdoms();
                kdFilter.innerHTML = '<option value="all">All Kingdoms</option>';
                kingdoms.forEach(kd => {
                    const option = document.createElement('option');
                    option.value = kd;
                    option.textContent = `Kingdom ${kd}`;
                    kdFilter.appendChild(option);
                });
            }
            
            // Clear and populate table
            if (tbody) {
                tbody.innerHTML = '';
                
                if (players && players.length > 0) {
                    players.forEach((player, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${player.username || 'Unknown'}</td>
                            <td>${player.kdNumber || '-'}</td>
                            <td>${formatNumber(player.currentPower || 0)}</td>
                            <td>${formatNumber(player.totalKillPoints || 0)}</td>
                            <td>${formatNumber(player.t5Kills || 0)}</td>
                            <td>${formatNumber(player.t4Kills || 0)}</td>
                            <td>${formatNumber(player.deaths || 0)}</td>
                            <td>${formatNumber(player.dkpScore || 0)}</td>
                        `;
                        tbody.appendChild(row);
                    });
                    
                    // Update summary
                    const summaryDiv = document.getElementById('playerStatsSummary');
                    if (summaryDiv) {
                        const totalPlayers = players.length;
                        const totalDKP = players.reduce((sum, p) => sum + (p.dkpScore || 0), 0);
                        const totalT5 = players.reduce((sum, p) => sum + (p.t5Kills || 0), 0);
                        const totalT4 = players.reduce((sum, p) => sum + (p.t4Kills || 0), 0);
                        
                        summaryDiv.innerHTML = `
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <span class="stat-label">Total Players</span>
                                    <span class="stat-value">${formatNumber(totalPlayers)}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-label">Total DKP</span>
                                    <span class="stat-value">${formatNumber(totalDKP)}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-label">Total T5 Kills</span>
                                    <span class="stat-value">${formatNumber(totalT5)}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-label">Total T4 Kills</span>
                                    <span class="stat-value">${formatNumber(totalT4)}</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No player data available</td></tr>';
                }
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Data retriever not available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading player stats:', error);
        const tbody = document.getElementById('playersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Error loading player stats</td></tr>';
        }
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        // Upload status chart
        const status = await dbManager.getUploadStatus();
        const statusCounts = {
            'Complete': 0,
            'Partial': 0,
            'No Data': 0
        };
        
        Object.values(status).forEach(s => {
            if (s === 'has-data') statusCounts['Complete']++;
            else if (s === 'partial-data') statusCounts['Partial']++;
            else statusCounts['No Data']++;
        });
        
        const ctx = document.getElementById('uploadStatusChart');
        if (ctx) {
            // Destroy existing chart if it exists
            if (uploadStatusChart) {
                uploadStatusChart.destroy();
            }
            
            uploadStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            'rgba(40, 167, 69, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(220, 53, 69, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Data Upload Status'
                        }
                    }
                }
            });
        }
        
        // DKP trends chart
        const rankings = await dbManager.getRankings();
        const topKingdoms = rankings.slice(0, 5);
        
        const trendsCtx = document.getElementById('dkpTrendsChart');
        if (trendsCtx) {
            // Destroy existing chart if it exists
            if (dkpTrendsChart) {
                dkpTrendsChart.destroy();
            }
            
            dkpTrendsChart = new Chart(trendsCtx, {
                type: 'bar',
                data: {
                    labels: topKingdoms.map(k => `KD ${k.kdNumber}`),
                    datasets: [{
                        label: 'Total DKP',
                        data: topKingdoms.map(k => k.totalDKP),
                        backgroundColor: 'rgba(102, 126, 234, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top 5 Kingdoms by DKP'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Setup data management actions
function setupManageActions() {
    // Export all data button (removing as per request)
    const exportBtn = document.querySelector('.btn-primary');
    if (exportBtn) {
        exportBtn.style.display = 'none'; // Hide export button
    }
    
    // Clear Event Data button
    const clearEventBtn = document.querySelector('.btn-secondary');
    if (clearEventBtn) {
        clearEventBtn.addEventListener('click', async () => {
            const confirm = window.confirm(
                'Are you sure you want to clear all event data?\n\n' +
                'This will delete all player stats and DKP calculations for all events.\n' +
                'This action cannot be undone!'
            );
            
            if (confirm) {
                await clearEventData();
            }
        });
    }
    
    // Reset Database button
    const resetBtn = document.querySelector('.btn-danger');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const confirm1 = window.confirm(
                '⚠️ WARNING: Reset Entire Database? ⚠️\n\n' +
                'This will permanently delete:\n' +
                '• All kingdom data\n' +
                '• All event data\n' +
                '• All player statistics\n' +
                '• All DKP calculations\n' +
                '• All aggregated data\n\n' +
                'Are you absolutely sure?'
            );
            
            if (confirm1) {
                const confirm2 = window.confirm(
                    '🚨 FINAL WARNING 🚨\n\n' +
                    'This will DELETE EVERYTHING and cannot be undone!\n\n' +
                    'Type OK to confirm you want to reset the entire database.'
                );
                
                if (confirm2) {
                    await resetDatabase();
                }
            }
        });
    }
}

// Clear all event data
async function clearEventData() {
    try {
        const clearBtn = document.querySelector('.btn-secondary');
        clearBtn.disabled = true;
        clearBtn.textContent = 'Clearing...';
        
        const db = firebase.firestore();
        const batch = db.batch();
        let deleteCount = 0;
        
        // Get all events
        const events = ['Pass 4*', 'Altar of darkness', 'Pass 7', 'Pass 8', 'Great ziggurat'];
        
        for (const eventName of events) {
            // Delete event collection documents
            const eventSnapshot = await db.collection('events')
                .doc(eventName)
                .collection('kingdoms')
                .get();
            
            for (const kdDoc of eventSnapshot.docs) {
                // Delete all player subcollections
                const playerSnapshot = await kdDoc.ref.collection('players').get();
                playerSnapshot.forEach(playerDoc => {
                    batch.delete(playerDoc.ref);
                    deleteCount++;
                });
                
                batch.delete(kdDoc.ref);
                deleteCount++;
            }
            
            // Delete aggregate data for this event
            const campSnapshot = await db.collectionGroup('camps').get();
            campSnapshot.forEach(doc => {
                if (doc.id === eventName) {
                    batch.delete(doc.ref);
                    deleteCount++;
                }
            });
            
            const kingdomSnapshot = await db.collection('aggregates')
                .doc('kingdoms')
                .collection('kingdoms')
                .get();
            
            for (const kdDoc of kingdomSnapshot.docs) {
                const eventDoc = await kdDoc.ref.collection('events').doc(eventName).get();
                if (eventDoc.exists) {
                    batch.delete(eventDoc.ref);
                    deleteCount++;
                }
            }
        }
        
        // Clear cumulative data
        const cumulativeKingdoms = await db.collection('aggregates')
            .doc('cumulative')
            .collection('kingdoms')
            .get();
        
        cumulativeKingdoms.forEach(doc => {
            batch.update(doc.ref, {
                events: {},
                totalT4: 0,
                totalT5: 0,
                totalDeaths: 0,
                totalHealed: 0,
                totalDKP: 0,
                totalKillPoints: 0,
                eventCount: 0
            });
        });
        
        // Commit the batch
        await batch.commit();
        
        // Clear cache
        if (window.dataRetriever) {
            window.dataRetriever.clearCache();
        }
        
        alert(`Successfully cleared all event data!\nDeleted ${deleteCount} records.`);
        
        // Refresh the page
        location.reload();
        
    } catch (error) {
        console.error('Error clearing event data:', error);
        alert('Error clearing event data: ' + error.message);
    } finally {
        const clearBtn = document.querySelector('.btn-secondary');
        clearBtn.disabled = false;
        clearBtn.textContent = 'Clear Event Data';
    }
}

// Reset entire database
async function resetDatabase() {
    try {
        const resetBtn = document.querySelector('.btn-danger');
        resetBtn.disabled = true;
        resetBtn.textContent = 'Resetting...';
        
        const db = firebase.firestore();
        let deleteCount = 0;
        
        console.log('Starting complete database reset...');
        
        // Function to recursively delete all documents in a collection
        async function deleteCollection(collectionRef) {
            const snapshot = await collectionRef.get();
            
            if (snapshot.empty) {
                return;
            }
            
            // Process in batches of 100
            const batchSize = 100;
            const batches = [];
            let batch = db.batch();
            let count = 0;
            
            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                deleteCount++;
                count++;
                
                if (count >= batchSize) {
                    batches.push(batch.commit());
                    batch = db.batch();
                    count = 0;
                }
            }
            
            // Commit remaining batch
            if (count > 0) {
                batches.push(batch.commit());
            }
            
            await Promise.all(batches);
        }
        
        // Function to delete document (removed listCollections as it's not available in client SDK)
        
        // 1. Delete events collection and all subcollections
        console.log('Deleting events collection...');
        const events = ['Pass 4*', 'Altar of darkness', 'Pass 7', 'Pass 8', 'Great ziggurat'];
        for (const eventName of events) {
            const eventDoc = db.collection('events').doc(eventName);
            
            // Delete kingdoms subcollection
            const kingdomsCol = eventDoc.collection('kingdoms');
            const kingdomDocs = await kingdomsCol.get();
            
            for (const kdDoc of kingdomDocs.docs) {
                // Delete players subcollection
                const playersCol = kdDoc.ref.collection('players');
                await deleteCollection(playersCol);
                
                // Delete kingdom document
                await kdDoc.ref.delete();
                deleteCount++;
            }
            
            // Delete event document
            await eventDoc.delete();
            deleteCount++;
        }
        
        // 2. Delete aggregates collection with all nested structure
        console.log('Deleting aggregates collection...');
        
        // Delete aggregates/kingdoms/[kdNumber]/[eventName]
        // We need to know all possible kingdom numbers
        const allKdNumbers = [];
        for (const kingdoms of Object.values(CAMPS)) {
            allKdNumbers.push(...kingdoms);
        }
        
        for (const kdNumber of allKdNumbers) {
            const kdCol = db.collection('aggregates')
                .doc('kingdoms')
                .collection(kdNumber.toString());
            
            const kdDocs = await kdCol.get();
            for (const doc of kdDocs.docs) {
                await doc.ref.delete();
                deleteCount++;
            }
        }
        
        // Delete aggregates/camps/[camp]/[eventName]
        const camps = ['Fire', 'Earth', 'Water', 'Wind'];
        for (const camp of camps) {
            const campCol = db.collection('aggregates')
                .doc('camps')
                .collection(camp);
            
            const campDocs = await campCol.get();
            for (const doc of campDocs.docs) {
                await doc.ref.delete();
                deleteCount++;
            }
        }
        
        // Delete aggregates/cumulative/kingdoms/[kdNumber]
        const cumulativeKingdoms = db.collection('aggregates')
            .doc('cumulative')
            .collection('kingdoms');
        await deleteCollection(cumulativeKingdoms);
        
        // Delete aggregates/cumulative/camps/[camp]
        const cumulativeCamps = db.collection('aggregates')
            .doc('cumulative')
            .collection('camps');
        await deleteCollection(cumulativeCamps);
        
        // Delete the main aggregate documents
        try {
            await db.collection('aggregates').doc('kingdoms').delete();
            deleteCount++;
        } catch (e) {
            console.log('Could not delete aggregates/kingdoms:', e.message);
        }
        
        try {
            await db.collection('aggregates').doc('camps').delete();
            deleteCount++;
        } catch (e) {
            console.log('Could not delete aggregates/camps:', e.message);
        }
        
        try {
            await db.collection('aggregates').doc('cumulative').delete();
            deleteCount++;
        } catch (e) {
            console.log('Could not delete aggregates/cumulative:', e.message);
        }
        
        // 3. Delete kingdoms collection (if exists from old structure)
        console.log('Deleting kingdoms collection (legacy)...');
        const kingdomsCol = db.collection('kingdoms');
        const kingdomsDocs = await kingdomsCol.get();
        
        for (const doc of kingdomsDocs.docs) {
            // Try to delete known subcollections (events)
            const eventsCol = doc.ref.collection('events');
            const eventDocs = await eventsCol.get();
            for (const eventDoc of eventDocs.docs) {
                await eventDoc.ref.delete();
                deleteCount++;
            }
            
            await doc.ref.delete();
            deleteCount++;
        }
        
        // 4. Clear any legacy data in the old structure
        const legacyCollections = ['camps', 'players', 'rankings'];
        for (const collectionName of legacyCollections) {
            try {
                console.log(`Deleting ${collectionName} collection (legacy)...`);
                const col = db.collection(collectionName);
                await deleteCollection(col);
            } catch (e) {
                console.log(`Collection ${collectionName} might not exist:`, e.message);
            }
        }
        
        // 5. Use collectionGroup to find any remaining nested documents
        console.log('Searching for any remaining nested documents...');
        
        // Delete all player documents across all collections
        try {
            const allPlayers = await db.collectionGroup('players').get();
            if (!allPlayers.empty) {
                console.log(`Found ${allPlayers.size} player documents to delete`);
                const batch = db.batch();
                allPlayers.forEach(doc => {
                    batch.delete(doc.ref);
                    deleteCount++;
                });
                await batch.commit();
            }
        } catch (e) {
            console.log('No player documents found or error:', e.message);
        }
        
        // Delete all kingdoms documents across all collections
        try {
            const allKingdoms = await db.collectionGroup('kingdoms').get();
            if (!allKingdoms.empty) {
                console.log(`Found ${allKingdoms.size} kingdom documents to delete`);
                const batch = db.batch();
                allKingdoms.forEach(doc => {
                    batch.delete(doc.ref);
                    deleteCount++;
                });
                await batch.commit();
            }
        } catch (e) {
            console.log('No kingdom documents found or error:', e.message);
        }
        
        // Delete all camps documents across all collections
        try {
            const allCamps = await db.collectionGroup('camps').get();
            if (!allCamps.empty) {
                console.log(`Found ${allCamps.size} camp documents to delete`);
                const batch = db.batch();
                allCamps.forEach(doc => {
                    batch.delete(doc.ref);
                    deleteCount++;
                });
                await batch.commit();
            }
        } catch (e) {
            console.log('No camp documents found or error:', e.message);
        }
        
        // 6. Final cleanup - try to delete any root collections we might have missed
        console.log('Final cleanup of root collections...');
        const rootCollections = [
            'events', 'aggregates', 'kingdoms', 'camps', 'players', 'rankings'
        ];
        
        for (const colName of rootCollections) {
            try {
                const col = db.collection(colName);
                const docs = await col.limit(1).get();
                if (!docs.empty) {
                    console.log(`Still found documents in ${colName}, deleting...`);
                    await deleteCollection(col);
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Clear cache
        if (window.dataRetriever) {
            window.dataRetriever.clearCache();
        }
        
        // Clear local storage but preserve admin authentication
        const adminAuth = localStorage.getItem('admin_auth');
        localStorage.clear();
        if (adminAuth) {
            localStorage.setItem('admin_auth', adminAuth);
        }
        
        console.log(`Database reset complete! Deleted ${deleteCount} records.`);
        alert(`Database reset complete!\nDeleted ${deleteCount} records.\n\nThe page will now reload.`);
        
        // Reload the page
        location.reload();
        
    } catch (error) {
        console.error('Error resetting database:', error);
        alert('Error resetting database: ' + error.message);
    } finally {
        const resetBtn = document.querySelector('.btn-danger');
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset Database';
        }
    }
}

// Helper function
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}