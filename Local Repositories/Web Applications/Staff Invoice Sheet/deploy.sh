#!/bin/bash

# Staff Invoice Sheet - Firebase Deployment Script
# Project: staff-invoice-sheet

echo "🚀 Deploying Staff Invoice Sheet to Firebase..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found!"
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI installed"
    echo ""
fi

# Login check
echo "🔐 Checking Firebase authentication..."
firebase login --reauth
echo ""

# Confirm project
echo "📋 Current project: staff-invoice-sheet"
firebase use staff-invoice-sheet
echo ""

# Optional: Test locally first
read -p "🧪 Would you like to test locally first? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🌐 Starting local server..."
    echo "   Open http://localhost:5000 in your browser"
    echo "   Press Ctrl+C to stop and continue deployment"
    firebase serve
fi

# Deploy
echo ""
echo "📤 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at:"
echo "   Primary:     https://staff-invoice-sheet.web.app"
echo "   Alternative: https://staff-invoice-sheet.firebaseapp.com"
echo ""
echo "📊 View deployment:"
echo "   https://console.firebase.google.com/project/staff-invoice-sheet/hosting"
echo ""
