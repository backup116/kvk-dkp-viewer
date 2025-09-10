// Map handler for interactive kingdom selection
class MapHandler {
    constructor() {
        this.initializeMap();
    }

    initializeMap() {
        // This functionality is already handled in admin.js
        // This file can be used for additional map-specific features
        console.log('Map handler initialized');
    }

    // Helper function to update KD status colors
    updateKingdomStatus(kdNumber, status) {
        const label = document.querySelector(`.kd-label[data-kd="${kdNumber}"]`);
        if (label) {
            label.classList.remove('has-data', 'partial-data', 'no-data');
            label.classList.add(status);
        }
    }

    // Get camp for a kingdom
    getCampForKingdom(kdNumber) {
        const camps = {
            "Fire": [1400, 1068, 1471, 2162, 2197, 1520],
            "Earth": [1244, 1694, 2944, 3590, 2546, 1014],
            "Water": [3554, 1896, 1569, 3152, 3596, 2711, 1267],
            "Wind": [2352, 2973, 1477, 1294, 1732, 2509, 1359]
        };

        for (const [camp, kingdoms] of Object.entries(camps)) {
            if (kingdoms.includes(parseInt(kdNumber))) {
                return camp;
            }
        }
        return null;
    }

    // Highlight kingdom on hover
    highlightKingdom(kdNumber) {
        const label = document.querySelector(`.kd-label[data-kd="${kdNumber}"]`);
        if (label) {
            label.style.transform = 'scale(1.2)';
            label.style.zIndex = '1000';
        }
    }

    // Remove highlight
    unhighlightKingdom(kdNumber) {
        const label = document.querySelector(`.kd-label[data-kd="${kdNumber}"]`);
        if (label) {
            label.style.transform = 'scale(1)';
            label.style.zIndex = 'auto';
        }
    }

    // Show kingdom tooltip
    showKingdomTooltip(kdNumber, event) {
        // Can be extended to show kingdom stats on hover
        const camp = this.getCampForKingdom(kdNumber);
        console.log(`Kingdom ${kdNumber} - Camp: ${camp}`);
    }
}

// Initialize map handler
const mapHandler = new MapHandler();

// Export for use in other modules
window.mapHandler = mapHandler;