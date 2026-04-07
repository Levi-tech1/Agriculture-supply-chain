# Deploying the Agricultural Supply Chain to a Website

You can run this project on the internet by hosting the **frontend**, **backend**, and **database** on free or low-cost services.

## Overview

| Part       | What to deploy              | Suggested free hosts              |
|-----------|-----------------------------|-----------------------------------|
| Frontend  | React app (built with Vite) | Vercel, Netlify, GitHub Pages     |
| Backend   | Node.js API                 | Render, Railway, Fly.io           |
| Database  | MongoDB                     | MongoDB Atlas (free tier)         |
| Blockchain| Optional for demo           | Keep local or use a testnet RPC  |

---

## 1. Database: MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a **free cluster** and get the connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/agri-supply-chain`).
3. In Atlas: **Network Access** → Add **0.0.0.0/0** (allow from anywhere) so your backend host can connect.
4. Copy the **connection string** for the next step.

---

## 2. Backend (e.g. Render)

1. Push your project to **GitHub** (if not already).
2. Go to [render.com](https://render.com) → **New** → **Web Service**.
3. Connect the repo and set:
   - **Root Directory:** `backend` (or leave blank if repo root; then set **Build Command** to run from backend).
   - **Build Command:** `npm install` (or `cd backend && npm install` if root).
   - **Start Command:** `node src/index.js` (or `cd backend && node src/index.js` if root).
4. Add **Environment Variables** in the Render dashboard:

   | Variable         | Value |
   |------------------|--------|
   | `PORT`           | `4000` (Render sets this; you can leave or use 4000) |
   | `MONGODB_URI`    | Your Atlas connection string |
   | `JWT_SECRET`     | A long random string (e.g. from a password generator) |
   | `FRONTEND_URL`   | Your frontend URL (e.g. `https://your-app.vercel.app`) |
   | `OWNER_EMAIL`    | Admin login email |
   | `OWNER_PASSWORD` | Admin login password |
   | `CONTRACT_ADDRESS` | Deployed contract address (optional; can leave empty for demo) |
   | `ETH_RPC_URL`    | e.g. `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` (optional) |

5. Deploy. Note the backend URL (e.g. `https://your-api.onrender.com`).

---

## 3. Frontend (e.g. Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
2. Set **Root Directory** to `frontend` (if your repo is the monorepo root).
3. **Build settings:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables** (pick **one** way to reach the API):

   **Option A — direct API (simplest):** set at build time

   | Variable               | Value |
   |------------------------|--------|
   | `VITE_API_URL`         | Your **backend** URL, e.g. `https://your-api.onrender.com` (no trailing slash, **not** the frontend URL) |
   | `VITE_CONTRACT_ADDRESS`| Same as backend `CONTRACT_ADDRESS` (optional) |

   **Option B — same-origin `/api` proxy:** leave `VITE_API_URL` **unset**, and set on the **frontend** Vercel project:

   | Variable       | Value |
   |----------------|--------|
   | `BACKEND_URL`  | Same backend origin as above (e.g. `https://your-api.onrender.com`) — **must not** be your frontend `*.vercel.app` URL, or you will get HTTP 404 on `/api/*`. |

   The repo includes `frontend/api/[...path].js` so Vercel can forward `/api/*` to `BACKEND_URL`.

5. Deploy. Vercel will give you a URL like `https://your-app.vercel.app`.

---

## 4. Finish backend CORS

In the **backend** host (Render), set:

- `FRONTEND_URL` = your **frontend** URL (e.g. `https://your-app.vercel.app`).

Redeploy the backend if you added this after the first deploy.

---

## 5. Run the project on the website

1. Open the **frontend** URL (e.g. `https://your-app.vercel.app`).
2. Log in with `OWNER_EMAIL` and `OWNER_PASSWORD` you set in the backend.
3. Or **Register** a new user and use that to log in.

---

## Build and test locally (production-like)

- **Backend:** from repo root, `npm run dev:backend` (or from `backend`: `npm run dev`). Use a real `MONGODB_URI` (e.g. Atlas) in `backend/.env`.
- **Frontend:** from `frontend`, set `VITE_API_URL` to your deployed backend URL or `http://localhost:4001`, then `npm run build` and `npm run preview` to test the built app.

---

## Optional: same-domain setup

To avoid CORS and keep a single domain:

- Use a **reverse proxy** (e.g. Nginx or your host’s proxy) so that:
  - `https://yourdomain.com` → frontend (static files).
  - `https://yourdomain.com/api` → backend.
- Then leave `VITE_API_URL` **empty** so the frontend uses relative `/api` and everything works under one domain.

You can run this project on a website by following the steps above.
