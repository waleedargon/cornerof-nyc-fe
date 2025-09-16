# Environment Setup Instructions

## Fix Gemini API Key Error

The error you're seeing:
```
FAILED_PRECONDITION: Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
```

### Solution:

1. **Create `.env.local` file** in your project root (`/Users/waleed/Documents/Projects/studio/.env.local`):

```bash
# Gemini AI API Key
GOOGLE_API_KEY=your_actual_gemini_api_key_here
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

2. **Replace `your_actual_gemini_api_key_here`** with your real Gemini API key.

3. **Restart your development server**:
```bash
npm run dev
```

### How to get Gemini API Key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Paste it in your `.env.local` file

### Example `.env.local` file:
```bash
GOOGLE_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvw
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvw
```

### Note:
- The `.env.local` file is automatically ignored by Git for security
- Never commit API keys to version control
- Restart your dev server after adding environment variables
