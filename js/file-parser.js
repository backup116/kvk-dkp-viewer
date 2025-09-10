// File Parser for Excel and CSV files - handles DKP calculations
class FileParser {
    constructor() {
        this.eventData = null;
        this.currentKD = null;
        this.currentEvent = null;
    }

    // Parse file (Excel or CSV)
    parseFile(file) {
        return new Promise((resolve, reject) => {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // Parse Excel file
                this.parseExcel(file).then(resolve).catch(reject);
            } else if (fileName.endsWith('.csv')) {
                // Parse CSV file
                this.parseCSV(file).then(resolve).catch(reject);
            } else {
                reject(new Error('Unsupported file type. Please use Excel (.xlsx, .xls) or CSV (.csv) files.'));
            }
        });
    }

    // Parse Excel file using SheetJS
    parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get the first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,  // Use array format
                        defval: 0   // Default value for empty cells
                    });
                    
                    // Process the Excel data
                    const processedData = this.processExcelData(jsonData);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Error parsing Excel file: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Process Excel data
    processExcelData(data) {
        const aggregated = {
            totalPower: 0,
            highestPower: 0,
            deaths: 0,
            totalKillPoints: 0,
            resourcesGathered: 0,
            t5Kills: 0,
            t4Kills: 0,
            t3Kills: 0,
            t2Kills: 0,
            t1Kills: 0,
            allianceHelps: 0,
            healed: 0,  // NEW: Healed troops
            playerCount: 0,
            players: []
        };

        // Skip header row (index 0), start from index 1
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            
            // Excel column mapping (0-indexed):
            // A(0): Character ID, B(1): Username, C(2): Current Power, D(3): Highest Power,
            // E(4): Deaths, F(5): Total Kill Points, G(6): Resources Gathered,
            // H(7): T5, I(8): T4, J(9): T3, K(10): T2, L(11): T1, M(12): Alliance Helps
            // N(13): Healed (if present)
            
            if (row[0] && row[1]) { // Check if Character ID and Username exist
                aggregated.playerCount++;
                
                // Sum up all metrics
                aggregated.totalPower += this.parseNumber(row[2]);
                aggregated.highestPower += this.parseNumber(row[3]);
                aggregated.deaths += this.parseNumber(row[4]);
                aggregated.totalKillPoints += this.parseNumber(row[5]);
                aggregated.resourcesGathered += this.parseNumber(row[6]);
                aggregated.t5Kills += this.parseNumber(row[7]);
                aggregated.t4Kills += this.parseNumber(row[8]);
                aggregated.t3Kills += this.parseNumber(row[9]);
                aggregated.t2Kills += this.parseNumber(row[10]);
                aggregated.t1Kills += this.parseNumber(row[11]);
                aggregated.allianceHelps += this.parseNumber(row[12]);
                aggregated.healed += this.parseNumber(row[13]); // Healed column if present

                // Store player data for reference
                aggregated.players.push({
                    characterId: row[0],
                    username: row[1],
                    currentPower: this.parseNumber(row[2]),
                    deaths: this.parseNumber(row[4]),
                    totalKillPoints: this.parseNumber(row[5]), // Game's official kill points
                    t5Kills: this.parseNumber(row[7]),
                    t4Kills: this.parseNumber(row[8]),
                    t3Kills: this.parseNumber(row[9]),
                    t2Kills: this.parseNumber(row[10]),
                    t1Kills: this.parseNumber(row[11]),
                    healed: this.parseNumber(row[13])
                });
            }
        }

        return aggregated;
    }

    // Parse CSV file (backward compatibility)
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        reject(results.errors[0]);
                    } else {
                        resolve(this.processCSVData(results.data));
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    // Process CSV data
    processCSVData(data) {
        const aggregated = {
            totalPower: 0,
            highestPower: 0,
            deaths: 0,
            totalKillPoints: 0,
            resourcesGathered: 0,
            t5Kills: 0,
            t4Kills: 0,
            t3Kills: 0,
            t2Kills: 0,
            t1Kills: 0,
            allianceHelps: 0,
            healed: 0,  // NEW: Healed troops
            playerCount: 0,
            players: []
        };

        data.forEach(row => {
            if (row['Character ID'] && row['Username']) {
                aggregated.playerCount++;
                
                // Sum up all metrics
                aggregated.totalPower += row['Current Power'] || 0;
                aggregated.highestPower += row['Highest Power'] || 0;
                aggregated.deaths += row['Deaths'] || 0;
                aggregated.totalKillPoints += row['Total Kill Points'] || 0;
                aggregated.resourcesGathered += row['Resources Gathered'] || 0;
                aggregated.t5Kills += row['T5'] || 0;
                aggregated.t4Kills += row['T4'] || 0;
                aggregated.t3Kills += row['T3'] || 0;
                aggregated.t2Kills += row['T2'] || 0;
                aggregated.t1Kills += row['T1'] || 0;
                aggregated.allianceHelps += row['Alliance Helps'] || 0;
                aggregated.healed += row['Healed'] || 0;  // Healed column if present

                // Store player data for reference
                aggregated.players.push({
                    characterId: row['Character ID'],
                    username: row['Username'],
                    currentPower: row['Current Power'] || 0,
                    deaths: row['Deaths'] || 0,
                    totalKillPoints: row['Total Kill Points'] || 0, // Game's official kill points
                    t5Kills: row['T5'] || 0,
                    t4Kills: row['T4'] || 0,
                    t3Kills: row['T3'] || 0,
                    t2Kills: row['T2'] || 0,
                    t1Kills: row['T1'] || 0,
                    healed: row['Healed'] || 0
                });
            }
        });

        return aggregated;
    }

    // Helper function to parse numbers from Excel (handles scientific notation)
    parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        if (typeof value === 'number') {
            return value;
        }
        // Handle scientific notation (e.g., "1.36E+08")
        if (typeof value === 'string' && value.includes('E')) {
            return parseFloat(value);
        }
        // Remove commas and parse
        if (typeof value === 'string') {
            return parseFloat(value.replace(/,/g, '')) || 0;
        }
        return 0;
    }

    // Calculate DKP from event data (direct calculation, no delta needed)
    calculateDKP(eventData) {
        if (!eventData) {
            throw new Error('Event data is required');
        }

        // Direct calculation - the uploaded file already contains event scores
        // DKP Formula (our custom scoring): T4 Kills × 5 + T5 Kills × 10 + Dead Troops × 15
        const t5Points = eventData.t5Kills * 10;
        const t4Points = eventData.t4Kills * 5;
        const deathPoints = eventData.deaths * 15;
        const totalDKP = t5Points + t4Points + deathPoints;
        
        // Kill Points - Use the game's official "Total Kill Points" value directly
        const totalKP = eventData.totalKillPoints || 0;

        return {
            t5Kills: eventData.t5Kills,
            t4Kills: eventData.t4Kills,
            deaths: eventData.deaths,
            healed: eventData.healed || 0,
            t5Points: t5Points,
            t4Points: t4Points,
            deathPoints: deathPoints,
            totalDKP: totalDKP,
            totalKP: totalKP,  // NEW: Total Kill Points
            
            // Additional stats for reference
            t3Kills: eventData.t3Kills,
            t2Kills: eventData.t2Kills,
            t1Kills: eventData.t1Kills,
            totalPower: eventData.totalPower,
            totalKillPoints: eventData.totalKillPoints,
            resourcesGathered: eventData.resourcesGathered,
            playerCount: eventData.playerCount,
            players: eventData.players  // Include player details
        };
    }

    // Set event data
    setEventData(data) {
        this.eventData = data;
    }

    // Clear all data
    reset() {
        this.eventData = null;
        this.currentKD = null;
        this.currentEvent = null;
    }
    
    // Backward compatibility methods (will be removed later)
    setBeforeData(data) {
        this.eventData = data;
    }
    
    setAfterData(data) {
        // Ignored for backward compatibility
    }

    // Generate sample Excel file for testing
    generateSampleExcel() {
        const headers = ['Character ID', 'Username', 'Current Power', 'Highest Power', 
                        'Deaths', 'Total Kill Points', 'Resources Gathered', 
                        'T5', 'T4', 'T3', 'T2', 'T1', 'Alliance Helps'];
        
        const sampleData = [
            ['6557560', 'Savage 2973', 136444215, 384305025, 1000, 50000, 37898080, 100, 1000, 500, 200, 100, 120],
            ['33290409', 'Savage2973', 117086867, 181847440, 500, 25000, 11313353, 50, 500, 250, 100, 50, 18],
            ['34946882', 'M.B.K', 114582710, 204785563, 750, 30000, 0, 75, 750, 375, 150, 75, 13]
        ];
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kingdom Stats');
        
        // Save file
        XLSX.writeFile(wb, 'sample_kingdom_stats.xlsx');
    }

    // Export calculation results as JSON
    exportCalculation(kdNumber, eventName, calculation) {
        const exportData = {
            kingdom: kdNumber,
            event: eventName,
            timestamp: new Date().toISOString(),
            calculation: calculation,
            beforeData: this.beforeData,
            afterData: this.afterData
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dkp_${kdNumber}_${eventName.replace(/\s+/g, '_')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Create and export parser instance
const fileParser = new FileParser();
window.fileParser = fileParser;

// Keep backward compatibility
window.csvParser = fileParser;