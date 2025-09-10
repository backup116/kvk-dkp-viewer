# Quick Setup Guide

## ✅ Firebase Configuration - COMPLETE
Your Firebase project `kvk-stats-tracker-d6c29` is now configured in the app.

## 📋 Next Steps

### 1. Setup Firestore Database
Go to [Firebase Console](https://console.firebase.google.com/project/kvk-stats-tracker-d6c29/firestore) and:

1. Click "Create Database"
2. Choose "Start in production mode"
3. Select your preferred location
4. After creation, go to "Rules" tab and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kingdoms/{document=**} {
      allow read: if true;
      allow write: if true; // For testing only, add auth later
    }
  }
}
```

### 2. Enable Firebase Storage
Go to [Storage](https://console.firebase.google.com/project/kvk-stats-tracker-d6c29/storage) and:
1. Click "Get Started"
2. Accept the default rules for now

### 3. Local Testing
```bash
# Option 1: Using Node.js
npm start

# Option 2: Using Python
python -m http.server 8080
```

Then open: http://localhost:8080

### 4. Test the Application
1. Open http://localhost:8080/test.html
2. Generate sample CSV files
3. Go to main page and click "Admin Login"
4. Password: `kvk2001`
5. Click any kingdom on the map
6. Upload the generated CSV files

### 5. Deploy to GitHub Pages
```bash
git add .
git commit -m "Initial commit - RoK DKP Tracker"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Then in GitHub:
1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: main / (root)
4. Save

Your app will be live at: `https://[username].github.io/rok-stat-tracker/`

## 🎮 Admin Access
- URL: `/admin.html`
- Password: `kvk2001`

## 📊 DKP Formula
- T5 Kills × 10 points
- T4 Kills × 5 points  
- Deaths × 15 points

## 🏰 Kingdoms Distribution
- **Fire**: 1400, 1068, 1471, 2162, 2197, 1520
- **Earth**: 1244, 1694, 2944, 3590, 2546, 1014
- **Water**: 3554, 1896, 1569, 3152, 3596, 2711, 1267
- **Wind**: 2352, 2973, 1477, 1294, 1732, 2509, 1359

## ⚠️ Important
Remember to update Firebase security rules for production use!