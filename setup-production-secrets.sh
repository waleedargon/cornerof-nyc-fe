#!/bin/bash

# 🚀 Production Secrets Setup Script
# This script sets up the required secrets for Firebase App Hosting deployment

echo "🔧 Setting up production secrets for reCAPTCHA + Phone Auth..."
echo "=================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo "✅ Firebase CLI is ready"

# Set Firebase API Key secret
echo ""
echo "📱 Setting up Firebase API Key secret..."
echo "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0" | firebase functions:secrets:set FIREBASE_API_KEY

if [ $? -eq 0 ]; then
    echo "✅ Firebase API Key secret set successfully"
else
    echo "❌ Failed to set Firebase API Key secret"
    exit 1
fi

# Verify the secret was set
echo ""
echo "🔍 Verifying secrets..."
firebase functions:secrets:access FIREBASE_API_KEY > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Firebase API Key secret verified"
else
    echo "❌ Failed to verify Firebase API Key secret"
fi

# Check if service account secret exists
firebase functions:secrets:access SERVICE_ACCOUNT_JSON > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Service Account secret already exists"
else
    echo "⚠️  Service Account secret not found"
    echo "   You may need to set it manually if you haven't already:"
    echo "   firebase functions:secrets:set SERVICE_ACCOUNT_JSON --data-file keys/service-account.json"
fi

echo ""
echo "🎉 Production secrets setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your production domain to Firebase Authentication authorized domains"
echo "2. Add your production domain to reCAPTCHA Enterprise authorized domains"
echo "3. Deploy with: npm run deploy:all"
echo ""
echo "🔗 Useful links:"
echo "• Firebase Console: https://console.firebase.google.com/project/cornerof-nyc-a5faf/authentication/providers"
echo "• reCAPTCHA Console: https://console.cloud.google.com/security/recaptcha"
echo ""
echo "✨ Your international phone auth system is ready for production!"
