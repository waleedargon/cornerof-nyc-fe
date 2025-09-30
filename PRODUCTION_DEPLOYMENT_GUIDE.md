# 🚀 Production Deployment Guide - reCAPTCHA + Phone Auth

## 📋 **Server-Side Requirements for Production**

### **1. Environment Variables & Secrets**

You need to configure these secrets in Firebase/Google Cloud:

#### **Required Secrets:**
```bash
# Firebase API Key (for reCAPTCHA verification)
FIREBASE_API_KEY=AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0

# Firebase Service Account (for admin operations)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

#### **Set up secrets in Firebase:**
```bash
# 1. Set Firebase API Key secret
firebase functions:secrets:set FIREBASE_API_KEY --data-file <(echo "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0")

# 2. Set Service Account secret (if not already done)
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON --data-file keys/your-service-account.json
```

### **2. Update App Hosting Configuration**

Update your `apphosting.yaml` to include the Firebase API key:

```yaml
runConfig:
  minInstances: 0

env:
  - variable: SERVICE_ACCOUNT_JSON
    secret: firebase-service-account
    availability:
      - BUILD
      - RUNTIME
  - variable: FIREBASE_API_KEY
    secret: firebase-api-key
    availability:
      - BUILD
      - RUNTIME
  - variable: GOOGLE_API_KEY
    secret: google-api-key
    availability:
      - BUILD
      - RUNTIME
```

### **3. Domain Configuration**

#### **Add Production Domain to Firebase:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/cornerof-nyc-a5faf/authentication/providers)
2. Navigate to **Authentication** → **Sign-in method**
3. Scroll to **Authorized domains**
4. Add your production domain (e.g., `yourapp.com`)

#### **Add Domain to reCAPTCHA:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/security/recaptcha)
2. Select your reCAPTCHA site key: `6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n`
3. Add your production domain to authorized domains

## 🔧 **Deployment Steps**

### **Step 1: Update Environment Configuration**

Create/update your production environment secrets:

```bash
# Navigate to your project
cd /Users/waleed/Documents/Projects/cornerof-fe

# Set the Firebase API key secret
echo "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0" | firebase functions:secrets:set FIREBASE_API_KEY

# Verify secrets are set
firebase functions:secrets:access FIREBASE_API_KEY
```

### **Step 2: Update App Hosting Config**

Update `apphosting.yaml`:
```yaml
runConfig:
  minInstances: 0
  maxInstances: 10
  concurrency: 80
  cpu: 1
  memoryMiB: 512

env:
  - variable: FIREBASE_SERVICE_ACCOUNT_JSON
    secret: firebase-service-account
    availability:
      - BUILD
      - RUNTIME
  - variable: FIREBASE_API_KEY
    secret: firebase-api-key
    availability:
      - BUILD
      - RUNTIME
```

### **Step 3: Deploy to Production**

```bash
# Build the application
npm run build

# Deploy to Firebase App Hosting
firebase deploy --only apphosting

# Or deploy everything
npm run deploy:all
```

## 🔒 **Security Considerations**

### **1. API Key Security**
- ✅ **Server-side only**: API key is only used in server-side API routes
- ✅ **Environment variables**: Never hardcoded in client code
- ✅ **Secret management**: Stored in Firebase/Google Cloud secrets

### **2. Domain Restrictions**
- ✅ **Firebase domains**: Only authorized domains can use phone auth
- ✅ **reCAPTCHA domains**: Only authorized domains can execute reCAPTCHA
- ✅ **CORS**: API routes are protected by same-origin policy

### **3. Rate Limiting**
- ✅ **Firebase limits**: Built-in phone auth rate limiting
- ✅ **reCAPTCHA limits**: Enterprise API has built-in protection
- ✅ **Cloud Run limits**: Automatic scaling and protection

## 🌍 **Production Environment Variables**

Your production environment should have:

```bash
# In Firebase/Google Cloud Secrets
FIREBASE_API_KEY=AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# In your application (automatically injected)
NODE_ENV=production
```

## 📱 **Testing Production Deployment**

### **1. Verify API Endpoint**
```bash
# Test your deployed API
curl -X POST https://your-app-domain.com/api/verify-recaptcha \
  -H "Content-Type: application/json" \
  -d '{"token":"test","expectedAction":"PHONE_SIGNUP","siteKey":"6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n"}'
```

### **2. Test Phone Authentication**
1. Go to your production URL
2. Try signup with international phone number
3. Should receive real SMS
4. Verify OTP works

### **3. Monitor Logs**
```bash
# View Cloud Run logs
firebase apphosting:backends:logs --backend-id cornerof-nyc-a5faf

# Or in Google Cloud Console
# Go to Cloud Run → your-service → Logs
```

## 🚨 **Common Deployment Issues**

### **Issue 1: "API key not found"**
**Solution**: Ensure `FIREBASE_API_KEY` secret is set in Firebase
```bash
firebase functions:secrets:set FIREBASE_API_KEY --data-file <(echo "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0")
```

### **Issue 2: "Domain not authorized"**
**Solution**: Add production domain to:
- Firebase Authentication authorized domains
- reCAPTCHA Enterprise authorized domains

### **Issue 3: "reCAPTCHA verification failed"**
**Solution**: Check that:
- Site key matches in client and server
- Domain is authorized
- API key has reCAPTCHA Enterprise API enabled

### **Issue 4: "Service account not found"**
**Solution**: Ensure service account secret is properly set
```bash
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON --data-file keys/service-account.json
```

## ✅ **Deployment Checklist**

Before deploying to production:

- [ ] **Firebase API key** secret is set
- [ ] **Service account** secret is set  
- [ ] **Production domain** added to Firebase authorized domains
- [ ] **Production domain** added to reCAPTCHA authorized domains
- [ ] **App hosting config** includes all required environment variables
- [ ] **Build succeeds** locally (`npm run build`)
- [ ] **Tests pass** with production configuration
- [ ] **Phone authentication** enabled in Firebase Console
- [ ] **reCAPTCHA Enterprise** enabled in Google Cloud Console

## 🎯 **Quick Deployment Commands**

```bash
# Set up secrets (one-time)
echo "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0" | firebase functions:secrets:set FIREBASE_API_KEY

# Deploy to production
npm run build
firebase deploy --only apphosting

# Monitor deployment
firebase apphosting:backends:logs --backend-id cornerof-nyc-a5faf
```

## 🌟 **Production Features**

Once deployed, your production app will have:

- ✅ **Real SMS delivery** to international phone numbers
- ✅ **Enterprise reCAPTCHA** protection against bots
- ✅ **Server-side verification** for maximum security
- ✅ **Auto-scaling** Cloud Run infrastructure
- ✅ **Global CDN** for fast loading
- ✅ **50+ countries** phone number support

Your international phone authentication system is production-ready! 🚀🌍
