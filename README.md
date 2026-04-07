# Blockchain-based Agricultural Supply Chain Management System

End-to-end tracking of crops from farmers to markets on an **immutable blockchain ledger**, with transparency, traceability, and trust.

## Features

- **Register actors**: Farmers, buyers, distributors, retailers (inspectors registered by contract owner)
- **Record crop batches**: Type, quantity, harvest date, farm location on-chain
- **Track movement**: Quality inspection → Storage → Transport → Delivery → Market sale
- **Smart contract payments**: Automated payment release to farmer after sale
- **Real-time traceability**: Full history from farm to market on blockchain
- **QR code verification**: Consumers scan QR at market to verify origin, harvest date, transport history, and farmer

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Ethereum (Hardhat local network) |
| Smart contracts | Solidity 0.8 |
| Backend | Node.js, Express, ethers.js |
| Frontend | React, Vite, ethers.js (MetaMask) |
| Database | MongoDB (user accounts, batch index) |

## Project structure

```
├── contracts/          # Hardhat + Solidity
│   ├── contracts/      # AgriculturalSupplyChain.sol
│   ├── scripts/       # deploy.js
│   └── test/
├── backend/            # Node.js API
│   └── src/
│       ├── config/     # blockchain (ethers)
│       ├── models/     # User, Batch
│       ├── routes/     # auth, batches, actors, verify
│       └── middleware/
└── frontend/           # React (Vite)
    └── src/
        ├── config/     # contract ABI, address
        ├── context/    # Auth
        ├── pages/      # Login, Register, Dashboard, Batches, Verify, etc.
        └── components/
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- MetaMask (or other Ethereum wallet) for frontend

## Quick start

### 1. Install dependencies

From project root:

```bash
npm install
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Start local blockchain

```bash
cd contracts
npx hardhat node
```

Leave this running. Note the first account private key (for deployment and testing).

### 3. Deploy contract

In a new terminal:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed **CONTRACT_ADDRESS** (e.g. `0x5FbDB2315678afecb367f032d93F642f64180aa3`).

### 4. (Optional) Register an inspector

Inspectors are registered by the contract owner (deployer). Using Hardhat console:

```bash
cd contracts
npx hardhat console --network localhost
```

Then (replace inspector address and name/location):

```js
const c = await ethers.getContractAt("AgriculturalSupplyChain", "YOUR_CONTRACT_ADDRESS");
await c.registerInspector("INSPECTOR_WALLET_ADDRESS", "Quality Corp", "Iowa");
```

### 5. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

- `CONTRACT_ADDRESS` = address from step 3
- `MONGODB_URI` = your MongoDB connection string (default: `mongodb://localhost:27017/agri-supply-chain`)
- `JWT_SECRET` = any secret string
- `ETH_RPC_URL` = `http://127.0.0.1:8545` (already default)

### 6. Start backend

```bash
cd backend
npm run dev
```

### 7. Configure frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

- `VITE_CONTRACT_ADDRESS` = same CONTRACT_ADDRESS as backend

### 8. Start frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Usage flow

1. **Register** (Farmers, Buyers, Distributors, Retailers) with email, password, and **Connect Wallet** (MetaMask). Same wallet must be used for on-chain actions.
2. **Register on chain**: After login, each user should register on the blockchain once (Farmers/Buyers/Distributors/Retailers can self-register via contract; Inspectors are added by contract owner as above).
3. **Farmer**: Create a batch (crop type, quantity, harvest date, location) → transaction creates batch on chain; batch is also saved in backend for listing.
4. **Inspector**: Approve quality for a batch (stage: Created → QualityChecked).
5. **Distributor**: Move to storage → Start transport → Confirm delivery to retailer.
6. **Retailer**: List batch for sale with price (ETH).
7. **Buyer**: Buy batch (pay in ETH) → Optionally **Release payment to farmer** (releases ETH to farmer address).
8. **QR / Verify**: Each batch has a **Verify** link and QR code. Consumers open `/verify/<batchId>` (e.g. by scanning QR) to see **crop origin, harvest date, transport history, and farmer** — all read from the blockchain.

## API (backend)

| Method | Path | Description |
|-------|------|-------------|
| POST | /api/auth/register | Register (email, password, walletAddress, role, name, location) |
| POST | /api/auth/login | Login |
| PATCH | /api/auth/registered-on-chain | Mark user as registered on chain (after first on-chain register) |
| GET | /api/batches | List batches (auth) |
| POST | /api/batches | Register batchId in DB (farmer, auth) |
| GET | /api/batches/:batchId | Batch details from chain (auth) |
| GET | /api/verify/:batchId | **Public** full traceability (batch, farmer, current holder, transfers) |

## Environment variables

**Backend (`.env`):**

- `PORT` – API port (default 4000)
- `MONGODB_URI` – MongoDB connection string
- `CONTRACT_ADDRESS` – Deployed AgriculturalSupplyChain address
- `ETH_RPC_URL` – Ethereum RPC (default http://127.0.0.1:8545)
- `JWT_SECRET` – Secret for JWT
- `FRONTEND_URL` – Allowed CORS origin (default http://localhost:5173)

**Frontend (`.env`):**

- `VITE_CONTRACT_ADDRESS` – Same as backend CONTRACT_ADDRESS

## Expected outcomes

- **Trust**: Transparent, immutable record of each stage
- **Fair pricing & faster payments**: Smart contract holds payment until sale; release to farmer on confirmation
- **Reduced fraud**: No tampering of batch or transfer history
- **Full visibility**: Anyone can verify crop origin via QR/verify page


