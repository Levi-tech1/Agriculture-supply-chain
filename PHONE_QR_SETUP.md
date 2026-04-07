# Fix: iPhone "This site can't be reached" when scanning QR

When you scan a QR code on your **iPhone**, it opens a link. If that link is **localhost**, the phone tries to open it on itself and fails (ERR_CONNECTION_FAILED).

## Fix in 3 steps

### 1. Expose your app to the internet (choose one)

**Option A – ngrok (recommended, HTTPS)**  
1. Install [ngrok](https://ngrok.com/download).  
2. In a terminal run: `ngrok http 5173`  
3. Copy the **HTTPS** URL it shows (e.g. `https://a1b2c3d4.ngrok-free.app`).

**Option B – Same Wi‑Fi (no HTTPS)**  
1. On your PC, find your IP: Windows: `ipconfig` → "IPv4 Address" (e.g. `192.168.1.5`).  
2. Use: `http://192.168.1.5:5173` (replace with your IP).  
   iPhone and PC must be on the same Wi‑Fi.

### 2. Set the URL in the project

1. Open **`frontend/.env`** (create it if it doesn’t exist, copy from `frontend/.env.example`).  
2. Add or edit:

```env
VITE_VERIFY_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

For same Wi‑Fi use something like:

```env
VITE_VERIFY_BASE_URL=http://192.168.1.5:5173
```

(Use your real ngrok URL or PC IP.)

### 3. Restart the frontend

Stop the dev server (Ctrl+C) and start it again:

```bash
cd frontend
npm run dev
```

After this, new QR codes will use your ngrok (or LAN) URL. Scan again on your iPhone; the verify page should open.

---

**Note:** If you use ngrok, keep the `ngrok http 5173` terminal running while testing. The URL changes each time you restart ngrok (on the free tier) unless you use a reserved domain.
