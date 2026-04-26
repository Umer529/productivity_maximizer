# FocusFlow AI - Network Configuration Quick Reference

## ⚡ Quick Setup (30 seconds)

### 1️⃣ Start Backend
```bash
cd backend
npm install
npm run dev
```

### 2️⃣ Configure Frontend
```bash
cd frontend

# Copy the right config for your environment:
cp .env.web .env.local           # Web browser
cp .env.android .env.local       # Android emulator  
cp .env.physical .env.local      # Physical device (update IP!)
cp .env.ios .env.local           # iOS simulator
cp .env.expo-go .env.local       # Expo Go app
```

### 3️⃣ Find Your PC's IP (Physical Device Only)
```bash
# Windows:
ipconfig | findstr IPv4

# Mac/Linux:
ifconfig | grep inet
```

### 4️⃣ Update `.env.local` for Physical Device
```env
# Replace with YOUR PC's actual IP address
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

### 5️⃣ Start Frontend
```bash
npm install
npm start
```

---

## 🌐 Environment Map

| Platform | Config File | API URL | Notes |
|----------|-------------|---------|-------|
| **Web** | `.env.web` | `http://localhost:5000/api/v1` | Same machine, fastest |
| **Android Emulator** | `.env.android` | `http://10.0.2.2:5000/api/v1` | Auto-detected, just works |
| **iOS Simulator** | `.env.ios` | `http://localhost:5000/api/v1` | Mac only |
| **Physical Device** | `.env.physical` | `http://{YOUR_IP}:5000/api/v1` | ⚠️ Requires same WiFi |
| **Expo Go** | `.env.expo-go` | `http://{YOUR_IP}:5000/api/v1` | Scan QR code |

---

## 🔧 What Was Fixed

### 1. **Dynamic API URL Resolution** (apiClient.ts)
✅ Auto-detects platform (web, Android, iOS)
✅ Uses correct IP for each environment
✅ Fallback chain: env vars → auto-detection → localhost
✅ No more hardcoded IP addresses

### 2. **Retry Logic & Error Handling**
✅ Automatic retry with exponential backoff
✅ Timeout protection (30 seconds default)
✅ User-friendly error messages
✅ Network error detection

### 3. **Backend Configuration**
✅ Listens on 0.0.0.0 (all interfaces)
✅ CORS configured for all platforms
✅ Health check endpoint
✅ Detailed startup logs showing available IPs

### 4. **Environment Files**
✅ `.env.example` - Base template
✅ `.env.web` - Web browser
✅ `.env.android` - Android emulator
✅ `.env.ios` - iOS simulator
✅ `.env.physical` - Physical device
✅ `.env.expo-go` - Expo Go app

### 5. **Documentation**
✅ SETUP_GUIDE.md - Comprehensive setup
✅ TROUBLESHOOTING.md - 12+ common issues
✅ This file - Quick reference

### 6. **Debugging Tools**
✅ connectivityChecker.ts - Diagnostic utilities
✅ ConnectivityDebug.tsx - UI component for testing
✅ Health check endpoint
✅ Network error reporting

---

## 🎯 Common Scenarios

### Scenario 1: Same Machine (Web)
```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm start
# Press 'w' for web
# Opens http://localhost:19006
```
✅ **Works because**: Both on localhost

---

### Scenario 2: Android Emulator
```bash
# Backend (must be running)
npm run dev

# Frontend
npm start
# Press 'a' for Android
```
✅ **Works because**: 10.0.2.2 is special Android alias for host
✅ **Auto-detected**: No config needed!

---

### Scenario 3: Physical Device on WiFi
```bash
# 1. Find your IP
ipconfig  # Windows: 192.168.1.100

# 2. Update frontend/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1

# 3. Both on same WiFi
# Verify: ping 192.168.1.100

# 4. Start apps
npm run dev          # Backend
npm start            # Frontend
# Scan QR code with phone
```
✅ **Works because**: Same network = can reach any device by IP
⚠️ **Must be same WiFi**
⚠️ **Must use correct IP**

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Wrong IP for Physical Device
```env
# WRONG - using PC hostname
EXPO_PUBLIC_API_URL=http://my-pc:5000/api/v1

# RIGHT - using numeric IP
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

### ❌ Mistake 2: Different WiFi Networks
Device and PC must be on same WiFi
- ✗ PC on 5GHz, phone on 2.4GHz
- ✗ PC on WiFi, phone on cellular
- ✓ Both on same SSID/network

### ❌ Mistake 3: Firewall Blocking Port 5000
Windows may block Node.js on port 5000
Solution: Allow through Windows Firewall

### ❌ Mistake 4: Using `localhost` on Physical Device
```env
# WRONG - localhost is device's own machine
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1

# RIGHT - use your PC's IP
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

---

## 🧪 Testing Your Setup

### Quick Health Check
```bash
# Test from any device:
curl http://YOUR_IP:5000/api/v1/health

# Expected response:
# {"success":true,"message":"FocusFlow API is running (SQLite)"}
```

### Check Available IPs (Backend Output)
When you run `npm run dev`, you'll see:
```
🚀 FocusFlow API Server Started [SQLite]
📍 Local Server: http://localhost:5000

🌐 Server is accessible from these addresses:
   • http://192.168.1.100:5000
   • http://192.168.1.101:5000
```

### Test from App
Use the ConnectivityDebug component:
```typescript
import ConnectivityDebug from './components/ConnectivityDebug';

// Add to your app:
<ConnectivityDebug />
```

---

## 📱 Running All Platforms Simultaneously

You can run backend + web + Android + physical device at same time!

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend (web)
cd frontend && npm start
# Press 'w'

# Terminal 3: Frontend (mobile)
cd frontend && npm start
# Press 'a' (Android) or 'i' (iOS)

# Terminal 4: Frontend (Expo Go)
cd frontend && npm start
# Scan QR code on physical device

# All use same backend! ✓
```

---

## 🔐 Security Checklist

- [ ] Keep `.env.local` out of Git (in `.gitignore`)
- [ ] Use `.env.example` as template for others
- [ ] In production: use HTTPS, change JWT_SECRET, set NODE_ENV=production
- [ ] Restrict CORS origins to actual domains
- [ ] Use firewall to block unnecessary ports

---

## 📊 Network Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     WEB BROWSER                             │
│              http://localhost:19006                         │
│                                                              │
│  ──────────────────► http://localhost:5000/api/v1           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ANDROID EMULATOR (on PC)                       │
│                                                              │
│  ──────────────────► http://10.0.2.2:5000/api/v1           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PHYSICAL DEVICE (same WiFi: 192.168.1.50)                 │
│                                                              │
│  ──────────────────► http://192.168.1.100:5000/api/v1      │
│                         (PC's local IP)                     │
└─────────────────────────────────────────────────────────────┘

                              ▲
                              │ All connect to
                              ▼
                    
                    ┌──────────────────┐
                    │  BACKEND (PC)    │
                    │ localhost:5000   │
                    │                  │
                    │  • Express       │
                    │  • SQLite DB     │
                    │  • REST API      │
                    └──────────────────┘
```

---

## 🚀 Performance Tips

1. **Fastest**: Web + localhost (no network latency)
2. **Fast**: Emulator + 10.0.2.2 (same PC)
3. **Good**: Physical + WiFi (local network)
4. **Slow**: Physical + cellular (different network)

---

## 🆘 Debugging Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/v1/health

# Find your IP
ipconfig              # Windows
ifconfig              # Mac/Linux
hostname -I          # Linux

# Kill process on port 5000
netstat -ano | findstr :5000  # Windows (find PID)
taskkill /PID <PID> /F         # Windows (kill it)

lsof -ti:5000 | xargs kill -9  # Mac/Linux

# Check network connectivity
ping 192.168.1.100

# View backend logs (already in console)
npm run dev
```

---

## 📖 Further Reading

- **SETUP_GUIDE.md** - Detailed step-by-step for all platforms
- **TROUBLESHOOTING.md** - Solutions for 12+ common issues
- **apiClient.ts** - See retry logic, error handling
- **connectivityChecker.ts** - Diagnostic utilities

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Backend runs without errors: `npm run dev`
- [ ] Backend health check works: `curl http://localhost:5000/api/v1/health`
- [ ] Frontend starts: `npm start`
- [ ] Can reach backend from frontend
- [ ] No CORS errors in console
- [ ] Token storage works (login/logout)
- [ ] Can run web + mobile simultaneously
- [ ] API calls work (not just health check)
- [ ] Error messages are user-friendly

---

**FocusFlow AI is now ready to run on any platform! 🎉**

Last Updated: April 2026
Version: 1.0.0
