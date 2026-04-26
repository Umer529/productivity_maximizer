# 🚀 FocusFlow AI - Getting Started

Welcome! This guide will get you running in **5 minutes**.

---

## 📖 Choose Your Path

### 🎯 Just Want to Run It?
→ Go to **[NETWORK_CONFIG.md](NETWORK_CONFIG.md)** for quick setup

### 🔧 Need Detailed Instructions?
→ Go to **[SETUP_GUIDE.md](SETUP_GUIDE.md)** for step-by-step guide

### 🐛 Something's Not Working?
→ Go to **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** to fix it

### 📋 Want to Understand Everything?
→ Read **[CROSS_PLATFORM_SETUP.md](CROSS_PLATFORM_SETUP.md)**

---

## ⚡ Super Quick Start

### Step 1: Backend (Terminal 1)
```bash
cd backend
npm install
npm run dev
```

### Step 2: Frontend (Terminal 2)
```bash
cd frontend
npm install
cp .env.web .env.local    # For web browser
npm start
# Press 'w' to open in browser
```

### Done! ✅
- Backend: http://localhost:5000
- Frontend: http://localhost:19006

---

## 📱 Running on Different Devices

### Web Browser (Same PC)
```bash
npm start
# Press 'w'
```

### Android Emulator
```bash
npm start
# Press 'a'
# (Auto-configured!)
```

### iOS Simulator (Mac)
```bash
npm start
# Press 'i'
```

### Physical Device via Expo Go
```bash
# 1. Find your PC's IP:
ipconfig              # Windows
ifconfig              # Mac/Linux

# 2. Update frontend/.env.local:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
# (Replace 192.168.1.100 with your actual IP)

# 3. Start and scan QR code:
npm start
# Scan with phone camera
# Opens in Expo Go
```

---

## ✅ Verify It Works

```bash
# From any terminal:
curl http://localhost:5000/api/v1/health

# You should see:
# {"success":true,"message":"FocusFlow API is running (SQLite)"}
```

---

## 🔗 Documentation Map

```
START HERE
    ↓
NETWORK_CONFIG.md (Quick Reference)
    ↓
┌─────────────────────────────────────┐
│ Choose based on your needs:         │
├─────────────────────────────────────┤
│ • Need detailed setup?              │
│   → SETUP_GUIDE.md                  │
│                                     │
│ • Something broken?                 │
│   → TROUBLESHOOTING.md              │
│                                     │
│ • Want full overview?               │
│   → CROSS_PLATFORM_SETUP.md         │
│                                     │
│ • Need API documentation?           │
│   → Check /docs folder or README.md │
└─────────────────────────────────────┘
```

---

## 🎯 What You Get

After following the setup:

✅ **Web app** running in browser
✅ **Mobile app** running in emulator/physical device
✅ **One backend** serving all clients
✅ **Auto-configured** API URLs (no manual IP entry!)
✅ **Network resilience** (retries, timeouts, friendly errors)
✅ **Multi-platform** support (web, iOS, Android)

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot connect" | Check backend running: `npm run dev` |
| Wrong IP on device | Update `.env.local` with your PC's IP |
| CORS error | Backend restarting fixes it |
| Port 5000 in use | Kill process: `taskkill /PID <PID> /F` (Windows) |
| Emulator can't reach backend | Use 10.0.2.2, not 127.0.0.1 |

See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for detailed solutions.

---

## 📋 Checklist

Before considering setup done:

- [ ] Backend starts without errors
- [ ] `curl http://localhost:5000/api/v1/health` returns success
- [ ] Web app loads and connects to backend
- [ ] No CORS errors in browser console
- [ ] Can run web + mobile on same backend

---

## 🚀 Next Steps

1. **Quick start** using instructions above
2. **Run the app** on your target platform
3. **Test API calls** in the app
4. **Check console** for any errors
5. **Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** if issues arise

---

## 📞 Help

1. **Can't start?** → [SETUP_GUIDE.md](SETUP_GUIDE.md)
2. **Getting errors?** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. **Need quick reference?** → [NETWORK_CONFIG.md](NETWORK_CONFIG.md)
4. **Want full details?** → [CROSS_PLATFORM_SETUP.md](CROSS_PLATFORM_SETUP.md)

---

## 💡 Pro Tips

- Start backend first, then frontend
- Use `npm run dev` for backend (auto-restart on changes)
- Run backend + web + mobile simultaneously!
- Use ConnectivityDebug component to test connectivity
- Check backend logs for request details

---

**You're ready! Pick your platform above and get started! 🎉**
