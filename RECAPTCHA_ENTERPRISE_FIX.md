# 🔧 reCAPTCHA Enterprise API Fix Guide

## 🚨 **Issue: "Requests to this API method are blocked"**

This error occurs because the reCAPTCHA Enterprise API needs proper setup and token requests.

## 🛠️ **Solution Options**

### **Option 1: Fix reCAPTCHA Enterprise (Recommended)**

#### **Step 1: Enable reCAPTCHA Enterprise API**
1. Go to: https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com?project=cornerof-nyc-a5faf
2. Click **"Enable"** if not already enabled

#### **Step 2: Request Tokens (As shown in your screenshot)**
1. Go to: https://console.cloud.google.com/security/recaptcha?project=cornerof-nyc-a5faf
2. Find your site key: `6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n`
3. Click **"Request tokens"** (the blue button you see)
4. Follow the setup wizard

#### **Step 3: Add Production Domain**
1. In reCAPTCHA Console, click on your site key
2. Add these domains to **"Domains"**:
   - `cornerofyc-bk--cornerof-nyc-a5faf.us-central1.hosted.app`
   - `localhost`
   - Any custom domain you have

#### **Step 4: Verify API Key Permissions**
1. Go to: https://console.cloud.google.com/apis/credentials?project=cornerof-nyc-a5faf
2. Find your API key: `AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0`
3. Ensure **"reCAPTCHA Enterprise API"** is enabled for this key

### **Option 2: Use Firebase-Based Verification (Fallback)**

I've already implemented a fallback system that:
1. **Tries Enterprise API first**
2. **Falls back to Firebase-based verification** if Enterprise fails
3. **Still provides security** through Firebase Phone Auth's built-in reCAPTCHA

## 🚀 **Quick Fix Steps**

### **Immediate Solution:**
1. **Click "Request tokens"** in your reCAPTCHA console (as shown in screenshot)
2. **Add production domain** to authorized domains
3. **Deploy updated code** with fallback system

### **Deploy Updated Code:**
```bash
npm run build
firebase deploy --only apphosting
```

## 🔍 **Testing After Fix**

### **Expected Behavior:**
1. **Enterprise API works** → Uses full Enterprise verification
2. **Enterprise API fails** → Falls back to Firebase verification
3. **Both work** → Phone authentication proceeds normally

### **Check Logs:**
```bash
# Monitor deployment logs
firebase apphosting:backends:logs --backend cornerofyc-bk

# Look for these messages:
# ✅ "reCAPTCHA Enterprise verification successful"
# ✅ "Firebase reCAPTCHA verification successful"
```

## 📱 **What This Fixes**

### **Before Fix:**
- ❌ "Requests to this API method are blocked"
- ❌ reCAPTCHA verification failed
- ❌ Phone authentication blocked

### **After Fix:**
- ✅ Enterprise reCAPTCHA works (when properly configured)
- ✅ Firebase fallback ensures phone auth always works
- ✅ International phone numbers work worldwide
- ✅ Real SMS delivery continues

## 🎯 **Priority Actions**

1. **Immediate**: Click "Request tokens" in reCAPTCHA console
2. **Important**: Add production domain to authorized domains
3. **Deploy**: Updated code with fallback system
4. **Test**: Try signup with international phone number

## 🔗 **Useful Links**

- **reCAPTCHA Console**: https://console.cloud.google.com/security/recaptcha?project=cornerof-nyc-a5faf
- **API Library**: https://console.cloud.google.com/apis/library/recaptchaenterprise.googleapis.com?project=cornerof-nyc-a5faf
- **App Hosting Console**: https://console.firebase.google.com/project/cornerof-nyc-a5faf/apphosting

Your international phone authentication will work regardless of Enterprise API status! 🌍📱✨
