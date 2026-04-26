# FocusFlow AI - Complete Setup & Deployment Guide

## 🎯 Overview

This guide explains how to run the FocusFlow AI application across different environments:
- **Web Browser** (localhost)
- **Android Emulator** 
- **iOS Simulator**
- **Physical Device** (via Expo Go or APK)

---

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Python**: v3.8 or higher (for ML features)

### For Mobile Development
- **Expo CLI**: Install with `npm install -g expo-cli`
- **Android Studio**: For Android Emulator (optional for Windows/Mac)
- **Xcode**: For iOS Simulator (Mac only)

### For Physical Devices
- **Expo Go App**: Download from App Store or Google Play

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Start the backend server
npm run dev
```

You should see output like:
```
🚀 FocusFlow API Server Started [SQLite]
📍 Local Server: http://localhost:5000

🌐 Server is accessible from these addresses:
   • http://192.168.1.100:5000
   • http://192.168.1.101:5000
   (Your PC's local IP addresses)
```

**⚠️ Important**: Note your PC's IP address (e.g., 192.168.1.100). You'll need this for mobile devices.

### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure for your environment (see next section)
# Copy the appropriate .env file:
cp .env.web .env.local          # For web browser
cp .env.android .env.local      # For Android emulator
cp .env.physical .env.local     # For physical device (update IP address!)

# Start the frontend
npm start
```

---

## 🔧 Environment-Specific Setup

### Option 1: Web Browser (Localhost)

**Configuration**: `.env.web`

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
```

**Steps**:
1. Backend and frontend on the same machine ✓
2. Run: `npm start` in frontend, then press `w` for web
3. Open: http://localhost:19006

**✓ Expected Result**: App loads, API calls work

---

### Option 2: Android Emulator

**Configuration**: `.env.android`

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1
```

**Steps**:
1. Open Android Studio and launch an emulator
2. Backend running on your PC (it will connect to 10.0.2.2)
3. In frontend: `npm start`, then press `a` for Android
4. Wait for the app to build and load

**Note**: `10.0.2.2` is a special IP that the Android emulator uses to reach your PC

**✓ Expected Result**: App loads in emulator, API calls work

---

### Option 3: iOS Simulator

**Configuration**: `.env.ios`

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
```

**Steps**:
1. Make sure you have Xcode installed (Mac only)
2. Run: `npm start` in frontend
3. Press `i` for iOS simulator
4. Wait for the app to build and load

**✓ Expected Result**: App loads in simulator, API calls work

---

### Option 4: Physical Device (Expo Go)

**Configuration**: `.env.physical` or `.env.expo-go`

⚠️ **This requires special setup!** Follow carefully.

#### Step 1: Find Your PC's Local IP Address

**Windows**:
```bash
# Open Command Prompt or PowerShell and run:
ipconfig

# Look for "IPv4 Address" under your network adapter
# Example: 192.168.1.100
```

**Mac/Linux**:
```bash
# Open Terminal and run:
ifconfig
# or
hostname -I

# Look for your 192.168.x.x address
```

#### Step 2: Update Environment File

Edit `frontend/.env.local`:

```env
# Replace 192.168.1.100 with YOUR actual PC IP address
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

#### Step 3: Ensure Same WiFi Network

- Your PC and device **MUST** be on the same WiFi network
- Not cellular data
- Not a different network

#### Step 4: Start the App

```bash
cd frontend
npm start

# You'll see a QR code in the terminal
# Scan with your device's camera
# Opens Expo Go app automatically
# App loads and connects to your backend
```

**✓ Expected Result**: 
- App loads on your device
- You can see your PC's IP in the Expo CLI output: "To open the app with Expo Go, scan this QR code"

---

### Option 5: Physical Device (Built APK/IPA)

This is for production or standalone builds.

```bash
# Build APK for Android
cd frontend
npm run android

# Build IPA for iOS (requires Mac)
npm run ios

# Install on device and run
```

---

## 🔍 Troubleshooting

### Problem: "Cannot connect to server"

**Cause**: Incorrect API URL or backend not running

**Fix**:
1. Check backend is running: `npm run dev` in backend folder
2. Verify your `.env.local` has correct IP
3. Test connectivity: Open browser to `http://YOUR_IP:5000/api/v1/health`
4. You should see: `{"success":true,"message":"FocusFlow API is running (SQLite)"}`

### Problem: "Android emulator cannot reach 10.0.2.2"

**Cause**: Backend not listening on all interfaces (HOST setting)

**Fix**:
1. Check `backend/.env` has: `HOST=0.0.0.0`
2. Restart backend: `npm run dev`

### Problem: "Cannot reach backend on physical device"

**Cause**: Wrong IP address or different WiFi network

**Fix**:
1. Verify backend is running: `npm run dev`
2. Get correct PC IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update `.env.local` with correct IP
4. Verify both devices on same WiFi: `ping <your-pc-ip>`
5. Check firewall: Windows Firewall may block port 5000
   - Allow Node.js through Windows Firewall

### Problem: "Port 5000 already in use"

**Cause**: Another process using port 5000

**Fix**:
```bash
# Windows: Find and kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux: Find and kill process
lsof -ti:5000 | xargs kill -9
```

### Problem: "CORS error" or "Request blocked"

**Cause**: Backend CORS not configured for your origin

**Fix**:
1. Check `backend/src/server.js` CORS configuration
2. It should accept: localhost, 192.168.*, 10.0.*, and exp://
3. Restart backend after changes

---

## 🌐 Network Scenarios

| Scenario | Backend | Frontend | API URL | Works? |
|----------|---------|----------|---------|--------|
| **Web (same PC)** | localhost:5000 | localhost:19006 | http://localhost:5000/api/v1 | ✓ |
| **Android Emulator** | PC IP:5000 | Emulator | http://10.0.2.2:5000/api/v1 | ✓ |
| **iOS Simulator** | localhost:5000 | Simulator | http://localhost:5000/api/v1 | ✓ |
| **Physical + Expo Go** | Local IP:5000 | Phone on WiFi | http://192.168.x.x:5000/api/v1 | ✓ |
| **Physical + Built App** | Local IP:5000 | Phone on WiFi | http://192.168.x.x:5000/api/v1 | ✓ |

---

## 📱 Running Multiple Environments Simultaneously

You can run the same backend with multiple frontend clients:

1. **Backend**: `npm run dev` (listens on port 5000, all interfaces)
2. **Web**: `npm start` → press `w`
3. **Android**: `npm start` (different terminal) → press `a`
4. **Physical Device**: Scan QR code from `npm start` output

All will connect to the same backend API ✓

---

## 🔐 Security Notes

### For Development
- Keep `JWT_SECRET` in `.env` files
- Don't commit `.env.local` to Git (use `.env.example` instead)
- Use localhost when possible

### For Production
1. Change `JWT_SECRET` to a random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set `NODE_ENV=production`
3. Use HTTPS/TLS for API connections
4. Configure CORS for your actual domain

---

## 🐛 Debugging API Issues

### Check Backend Health

```bash
# From any machine on the network:
curl http://YOUR_IP:5000/api/v1/health

# Expected response:
# {"success":true,"message":"FocusFlow API is running (SQLite)"}
```

### View Backend Logs

Backend logs all requests in development mode:
```
GET /api/v1/auth/login 200 15.234 ms - 156
POST /api/v1/tasks 201 8.432 ms - 245
```

### Enable Verbose Frontend Logging

Edit `apiClient.ts` and uncomment console logs for debugging

---

## 📚 Additional Resources

- **Expo Documentation**: https://docs.expo.dev
- **React Native Networking**: https://react-native.dev/docs/network
- **Express CORS**: https://expressjs.com/en/resources/middleware/cors.html
- **Android Emulator Networking**: https://developer.android.com/studio/run/emulator-networking

---

## ✅ Validation Checklist

Before deploying, verify:

- [ ] Backend starts without errors: `npm run dev`
- [ ] Backend health check responds: `curl http://localhost:5000/api/v1/health`
- [ ] Frontend can reach backend (check browser console)
- [ ] Android emulator (if used) can reach 10.0.2.2:5000
- [ ] Physical device on WiFi can reach backend IP
- [ ] API calls work (not just health check)
- [ ] No CORS errors in browser/app console
- [ ] Token storage works (login/logout)
- [ ] Error messages are user-friendly

---

## 🆘 Still Having Issues?

1. Check `TROUBLESHOOTING.md` for detailed solutions
2. Verify all 6 requirements above are met
3. Check console logs (browser DevTools or mobile app logs)
4. Restart both backend and frontend
5. Clear app cache/storage and try again

---

**Last Updated**: April 2026
**Version**: 1.0.0
