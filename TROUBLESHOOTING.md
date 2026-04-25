# FocusFlow AI - Troubleshooting Guide

## Quick Diagnosis

Before diving into solutions, use this quick check:

```bash
# 1. Backend running?
curl http://localhost:5000/api/v1/health

# 2. Find your PC IP
ipconfig          # Windows
ifconfig          # Mac/Linux
hostname -I       # Mac/Linux

# 3. Can device reach backend?
ping <your-pc-ip>

# 4. Port open?
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux
```

---

## Common Issues & Solutions

### 1. "Network request failed" or "Cannot connect to server"

#### Symptom
- App shows error: "Unable to connect to server"
- Network tab in DevTools shows failed requests

#### Root Causes & Fixes

**A. Backend not running**
```bash
# Solution: Start backend
cd backend
npm run dev

# Expected: "FocusFlow API running on..."
```

**B. Wrong API URL**
```bash
# Check your .env.local file
cat frontend/.env.local

# For Android emulator - must be 10.0.2.2:5000
# For web - must be localhost:5000
# For physical device - must be YOUR_PC_IP:5000
```

**C. Firewall blocking port 5000**

**Windows**:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and check both Private & Public
4. Restart backend: `npm run dev`

**Mac**:
```bash
# Allow through firewall (may need sudo)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall off
```

**D. Backend not listening on all interfaces**
```bash
# Check backend/.env:
cat backend/.env | grep HOST

# Must have: HOST=0.0.0.0
# If missing, add it and restart backend
```

---

### 2. CORS Error: "Access to XMLHttpRequest blocked by CORS policy"

#### Symptom
- Browser console shows CORS error
- Request blocked by same-origin policy
- App can't make API calls

#### Solution
```bash
# Check backend/src/server.js has CORS configured for your origin
# Should include:
#   - http://localhost:8080, 8081, 19006 (web)
#   - /^http:\/\/192\.168\./ (local network)
#   - /^http:\/\/10\.0\./ (Android emulator)
#   - /^exp:\/\// (Expo Go)

# If not, edit server.js and add your origin to CORS list
# Then restart backend: npm run dev
```

---

### 3. Android Emulator: "Cannot reach 10.0.2.2"

#### Symptom
- Running on Android emulator
- Error when trying to connect to backend
- `10.0.2.2` not reachable

#### Solution

**Step 1**: Verify backend is listening on 0.0.0.0
```bash
# backend/.env must have:
HOST=0.0.0.0

# Restart: npm run dev
```

**Step 2**: Verify API URL in frontend
```bash
# frontend/.env.local must have:
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1
```

**Step 3**: Restart app in emulator
```bash
# In terminal running frontend:
# Press Ctrl+C
npm start
# Press 'a' for Android
# Let it rebuild
```

**Step 4**: Test directly from emulator
```bash
# In Android emulator, open Chrome
# Go to: http://10.0.2.2:5000/api/v1/health
# Should see: {"success":true,"message":"..."}
```

---

### 4. Physical Device on Expo Go: "App cannot connect"

#### Symptom
- Scanned QR code, app opened in Expo Go
- App loads but cannot reach backend
- Timeouts on network requests

#### Solution

**Step 1**: Get correct PC IP address
```bash
# Windows Command Prompt:
ipconfig

# Look for "IPv4 Address" - e.g., 192.168.1.100

# Mac/Linux Terminal:
ifconfig | grep inet

# Look for 192.168.x.x (not 127.0.0.1)
```

**Step 2**: Verify both on same WiFi
```bash
# On phone, go to Settings > WiFi
# Verify connected to same SSID as your PC

# In terminal, run:
ping <your-pc-ip>
# Should get replies, not timeouts
```

**Step 3**: Update frontend config
```bash
# Edit frontend/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1

# Replace 192.168.1.100 with YOUR actual IP
```

**Step 4**: Reload app
```bash
# In Expo Go app:
# Shake phone → select "Reload"
# Or: Kill and reopen Expo Go

# Rescan QR code if reload doesn't work
```

**Step 5**: Test connectivity
```bash
# On phone's WiFi, open browser
# Go to: http://YOUR_PC_IP:5000/api/v1/health
# Should see health check response
```

---

### 5. "Port 5000 already in use" or "Address already in use"

#### Symptom
```
Error: listen EADDRINUSE: address already in use :::5000
```

#### Solution

**Find process using port 5000**:

**Windows**:
```bash
# Command Prompt:
netstat -ano | findstr :5000

# Find PID in last column, then kill it:
taskkill /PID <PID> /F
```

**Mac/Linux**:
```bash
# Terminal:
lsof -ti:5000 | xargs kill -9

# Or:
fuser -k 5000/tcp
```

**Or just use different port**:
```bash
# In backend/.env:
PORT=5001

# Restart backend
npm run dev

# Update frontend .env.local to use new port
EXPO_PUBLIC_API_URL=http://localhost:5001/api/v1
```

---

### 6. "Invalid JSON response" or "Cannot read property of undefined"

#### Symptom
- Error: "Invalid JSON response from server"
- Error parsing API response
- App crashes on API call

#### Solution

**A. Backend crashed or crashed**:
```bash
# Check backend logs - it shows all errors
# Restart backend: npm run dev
# Verify it starts without errors
```

**B. Wrong API endpoint**:
```bash
# In apiClient.ts - verify path is correct
# Example: /api/v1/tasks not /api/tasks
```

**C. API route not implemented**:
```bash
# Check backend routes exist
ls backend/src/routes/

# Make sure you're calling valid endpoints
curl http://localhost:5000/api/v1/tasks
```

---

### 7. "Timeout" or "Request takes forever"

#### Symptom
- Request hangs for 30+ seconds
- Eventually shows timeout error
- No immediate error

#### Solution

**A. Network latency**:
- Check WiFi signal strength
- Try moving closer to router
- Check for other devices using bandwidth

**B. Backend overloaded**:
```bash
# Check backend logs for CPU/memory issues
# Try restarting: npm run dev

# In production, increase timeout in apiClient.ts:
# timeout: 60000  // 60 seconds instead of 30
```

**C. Database locked**:
```bash
# SQLite can have locking issues
# Delete data file and restart:
rm backend/data/focusflow.db
npm run dev
```

---

### 8. "401 Unauthorized" or "Token expired"

#### Symptom
- Login works, but requests fail with 401
- All API calls return "Unauthorized"
- After logout, still getting 401

#### Solution

**A. Clear token and login again**:
```bash
# In browser DevTools > Application:
# AsyncStorage > Clear
# Then logout and login

# Or in app settings, logout
```

**B. Token storage issue**:
```bash
# Check AsyncStorage is working
# In apiClient.ts, verify loadToken() is called

# Clear app cache (Android):
# Settings > Apps > FocusFlow > Storage > Clear Cache
```

**C. JWT_SECRET mismatch**:
```bash
# backend/.env must have JWT_SECRET set
# frontend doesn't need it (token is opaque to frontend)

# If changed JWT_SECRET:
# All existing tokens invalid
# Need to re-login
```

---

### 9. iOS Simulator won't connect

#### Symptom
- iOS simulator app loads
- But cannot reach backend
- Only on iOS, Android works

#### Solution

**Verify configuration**:
```bash
# frontend/.env.local must have:
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1

# iOS simulator has access to host's localhost
```

**Check backend listening on localhost**:
```bash
# backend/.env:
HOST=0.0.0.0

# Or explicitly:
HOST=127.0.0.1
```

**Rebuild app**:
```bash
# Clear cache:
rm -rf frontend/node_modules
npm install

# Restart simulator:
xcrun simctl erase all

# Rebuild:
npm start
Press 'i'
```

---

### 10. "Module not found" or dependency errors

#### Symptom
- Build fails with "Cannot find module"
- Error about missing package
- Random crashes on startup

#### Solution

**A. Clean install dependencies**:
```bash
# Frontend:
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend:
cd backend
rm -rf node_modules package-lock.json
npm install
```

**B. Wrong Node version**:
```bash
# Check version:
node --version
# Should be v18+

# Update Node:
# Download from nodejs.org or use nvm
```

**C. Expo compatibility issue**:
```bash
# Clear Expo cache:
expo start --clear

# Or with --web:
expo start --web --clear
```

---

### 11. "ENOENT: no such file or directory" database issues

#### Symptom
- Backend crashes with file not found
- Database file missing or deleted
- Tables don't exist

#### Solution

```bash
# Stop backend: Ctrl+C
# Check database exists:
ls -la backend/data/

# If missing, restart backend (it creates automatically):
npm run dev

# If exists but corrupted:
rm backend/data/focusflow.db
npm run dev
# DB will be recreated with schema
```

---

### 12. "Cannot find Expo CLI" or expo command not found

#### Symptom
```bash
expo: command not found
# Or: 'expo' is not recognized
```

#### Solution

**Install Expo CLI globally**:
```bash
npm install -g expo-cli

# Or with yarn:
yarn global add expo-cli

# Verify:
expo --version
```

---

## System-Level Debugging

### Enable Detailed Logging

**Frontend**:
```bash
# In apiClient.ts, add before fetch:
console.log('[API] Request:', url, method);

# After response:
console.log('[API] Response:', data);
```

**Backend**:
```bash
# Backend already logs requests in dev mode
# See: npm run dev output

# For more detail, add:
console.log('[Request]', req.method, req.path, req.body);
```

---

### Check Network Connectivity

```bash
# From frontend device/browser:

# 1. Can reach backend?
fetch('http://BACKEND_IP:5000/api/v1/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

# 2. Check CORS headers:
# DevTools > Network tab > click request > Headers
# Look for: 'Access-Control-Allow-Origin: *'
```

---

### Monitor Resource Usage

**Backend CPU/Memory**:
```bash
# Run with monitoring:
# Windows: Use Task Manager, search for node.exe
# Mac/Linux: Use top or htop
# Look for: %CPU and %MEM

# If high, there might be:
# - Memory leak
# - Infinite loops
# - Too many requests

# Solution: Restart backend
npm run dev
```

---

## Still Stuck?

1. **Check logs**: Both frontend and backend console
2. **Test health**: `curl http://localhost:5000/api/v1/health`
3. **Verify network**: `ping <your-pc-ip>` from device
4. **Clear everything**: Stop apps, delete node_modules, reinstall, restart
5. **Update tools**: `npm install -g npm expo-cli`

---

**Last Updated**: April 2026
