# Agricultural Supply Chain – Backend

Node.js (Express) backend for the Agricultural Supply Chain Management platform.

## Features

- **Authentication & RBAC**: JWT, roles (farmer, transporter, warehouse, retailer, consumer, admin, inspector)
- **User management**: Profiles, KYC/verification status, admin role assignment
- **Crop management**: Register crops, metadata, blockchain tx hash
- **Supply chain events**: Harvested, Stored, Transported, Delivered, etc., with timestamps and tx hashes
- **Blockchain integration**: Read batch/transfers/actors from smart contract
- **Payments**: Record payment release (on-chain release from frontend)
- **Verification & QR**: Public verify API, QR code image per crop
- **Security**: Rate limiting (100/min), input validation, request logging (morgan)

## Quick start

1. Copy `.env.example` to `.env`, set `CONTRACT_ADDRESS`, `MONGODB_URI` (or `memory` for in-memory DB).
2. `npm install && npm run dev`

## API

See [API.md](./API.md) for full endpoint list.

## Tests

- `npm test` – run API integration tests (auth, crops).
- If you see ESM-related errors, run: `NODE_OPTIONS=--experimental-vm-modules npm test` (Unix) or set `NODE_OPTIONS=--experimental-vm-modules` in your environment (Windows).

## Vercel (API host)

Deploy this folder as its own Vercel project (**Root Directory** = `backend`). The app is served via `api/index.js` + `vercel.json` rewrites (Express does not use `listen()` when `VERCEL=1`).

In the Vercel dashboard, do **not** set **Output Directory** to `frontend/dist` (that is for the separate frontend project). This repo’s `backend/vercel.json` uses `outputDirectory: dist`, created by `npm run build`.

**Required:** `MONGODB_URI` (Atlas or other — in-memory DB is not available on Vercel). Set `FRONTEND_URL` to your frontend origin(s), comma-separated if needed. Then set the frontend project’s `BACKEND_URL` to this deployment’s URL (no `/api` suffix).

## Environment

- `PORT`, `MONGODB_URI`, `CONTRACT_ADDRESS`, `ETH_RPC_URL`, `JWT_SECRET`, `FRONTEND_URL`
