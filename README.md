# Rise of Kingdoms - KvK DKP Tracker

A web application for tracking Dragon Kill Points (DKP) in Rise of Kingdoms KvK events. Features an interactive map interface for admins to upload Excel/CSV data and public rankings display.

## Features

### Public View
- **Real-time Rankings**: View kingdom rankings by total DKP
- **Camp Statistics**: Compare performance across Fire, Earth, Water, and Wind camps
- **Event Leaderboards**: Filter rankings by specific events
- **Auto-refresh**: Data updates every 30 seconds

### Admin Dashboard (Password: kvk2001)
- **Interactive Map**: Click on kingdom numbers to upload Excel/CSV data
- **Excel/CSV Upload**: Drag-and-drop interface for before/after event scans (supports .xlsx, .xls, .csv)
- **DKP Calculation**: Automatic calculation using formula: (T4 Kills × 5) + (T5 Kills × 10) + (Deaths × 15)
- **Upload Status**: Visual indicators showing data completion status
- **Analytics**: Charts showing upload progress and top kingdoms

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
- **Column F**: Total Kill Points
- **Column G**: Resources Gathered
- **Column H**: T5 (T5 kills - used in DKP calculation)
- **Column I**: T4 (T4 kills - used in DKP calculation)
- **Column J**: T3 (T3 kills)
- **Column K**: T2 (T2 kills)
- **Column L**: T1 (T1 kills)
- **Column M**: Alliance Helps

### CSV Format
If using CSV, the file must have headers matching the column names above.

## DKP Formula
DKP = (T4 Kills × 5) + (T5 Kills × 10) + (Deaths × 15)

Applied directly to the event scores in the uploaded file. Each file contains the deltas (changes) for that specific event, not cumulative totals.

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

1. Navigate to the main page
2. Click "Admin Login" and enter password: `kvk2001`
3. Click on any kingdom number on the interactive map
4. Select the event from dropdown
5. Upload "Before Event" Excel/CSV scan (.xlsx, .xls, or .csv)
6. Upload "After Event" Excel/CSV scan (.xlsx, .xls, or .csv)
7. Review DKP calculation preview
8. Click "Calculate & Save" to store data

### For Viewers

1. Navigate to the main page
2. View rankings, camp statistics, and event leaderboards
3. Use filters to narrow down results
4. Data refreshes automatically every 30 seconds

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