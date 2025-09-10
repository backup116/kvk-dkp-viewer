# Rise of Kingdoms - KvK DKP Tracker

A comprehensive web application for tracking Dragon Kill Points (DKP) and performance metrics during Kingdom vs Kingdom (KvK) events in Rise of Kingdoms.

## Features

### Public View
- **Real-time Rankings**: View kingdom rankings by DKP and Kill Points
- **Camp Statistics**: Compare performance across Fire, Earth, Water, and Wind camps
- **Event Leaderboards**: Filter rankings by specific events or view cumulative totals
- **Player Details**: View individual player contributions and statistics
- **Mobile Responsive**: Optimized for all device sizes

### Admin Dashboard (Password: kvk2001)
- **Interactive Map**: Click on kingdom numbers to upload Excel/CSV data
- **Excel/CSV Upload**: Direct event score upload (supports .xlsx, .xls, .csv)
- **DKP Calculation**: Custom formula: (T4 Kills × 5) + (T5 Kills × 10) + (Deaths × 15)
- **Kill Points**: Uses game's official "Total Kill Points" values
- **Analytics Dashboard**: Visual charts showing camp performance and trends
- **Data Management**: Clear event data or reset database

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "rok-dkp-tracker"
3. Enable Firestore Database
4. Enable Storage
5. Get your Firebase configuration from Project Settings
6. Update `js/firebase-config.js` with your config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. GitHub Pages Deployment

1. Push code to GitHub repository
2. Go to Settings → Pages
3. Enable GitHub Pages
4. Select source: "Deploy from a branch"
5. Select branch: main (or master)
6. Select folder: / (root)
7. Save and wait for deployment

Your app will be available at: `https://[username].github.io/rok-stat-tracker/`

### 3. Firebase Security Rules

Add these rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /kingdoms/{document=**} {
      allow read: if true;
      // Only allow write with admin authentication
      // In production, implement proper authentication
      allow write: if true; // Temporary for testing
    }
  }
}
```

## File Format (Excel/CSV)

### Excel Column Mapping
- **Column A**: Character ID
- **Column B**: Username
- **Column C**: Current Power
- **Column D**: Highest Power
- **Column E**: Deaths (used in DKP calculation)
- **Column F**: Total Kill Points (Game's official value)
- **Column G**: Resources Gathered
- **Column H**: T5 Kills (used in DKP calculation)
- **Column I**: T4 Kills (used in DKP calculation)
- **Column J**: T3 Kills
- **Column K**: T2 Kills
- **Column L**: T1 Kills
- **Column M**: Alliance Helps
- **Column N**: Healed (optional)

### CSV Format
If using CSV, the file must have headers:
- Character ID, Username, Current Power, Highest Power, Deaths, Total Kill Points, Resources Gathered, T5, T4, T3, T2, T1, Alliance Helps, Healed

## Scoring System

### DKP Formula (Custom)
DKP = (T4 Kills × 5) + (T5 Kills × 10) + (Deaths × 15)

### Kill Points
Uses the game's official "Total Kill Points" value directly from Column F (no calculation)

**Note**: Each uploaded file contains event scores (deltas), not cumulative totals.

## Kingdom Distribution

### Fire Camp 🔥
- 1400, 1068, 1471, 2162, 2197, 1520

### Earth Camp 🌍
- 1244, 1694, 2944, 3590, 2546, 1014

### Water Camp 💧
- 3554, 1896, 1569, 3152, 3596, 2711, 1267

### Wind Camp 💨
- 2352, 2973, 1477, 1294, 1732, 2509, 1359

## Events Schedule

1. **Pass 4***: Thu, 11.9, 7:04
2. **Altar of darkness**: Tue, 23.9, 7:04
3. **Pass 7**: Fri, 3.10, 7:04
4. **Pass 8**: Mon, 6.10, 7:04
5. **Great ziggurat**: Sun, 12.10, 7:04

## Usage

### For Admins

1. Navigate to `/admin.html`
2. Enter password: `kvk2001`
3. Click on any kingdom number on the interactive map
4. Select the event from dropdown
5. Upload Excel/CSV file with event scores (.xlsx, .xls, or .csv)
6. Review DKP calculation preview
7. Click "Calculate & Save" to store data

### For Viewers

1. Navigate to `/view.html` or main page
2. View camp comparisons and kingdom rankings
3. Filter by specific events or view cumulative totals
4. Click on kingdoms to see detailed player statistics

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase Firestore & Storage
- **Hosting**: GitHub Pages
- **Libraries**: 
  - SheetJS (XLSX) for Excel file parsing
  - PapaParse for CSV parsing (backward compatibility)
  - Chart.js for data visualization
  - Firebase SDK

## Development

To run locally:

1. Clone the repository
2. Update Firebase configuration
3. Serve using any static web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
4. Open http://localhost:8000

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues or questions, please create an issue on GitHub.