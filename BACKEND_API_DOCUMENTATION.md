# Agriculture Supply Chain Backend API Documentation

Complete backend system for Agriculture Supply Chain platform with blockchain integration, QR codes, and public verification.

## Features

✅ **Farmer Registration** - Register farmers on blockchain with wallet address, farm name, and location  
✅ **Crop Batch Creation** - Create batches with unique IDs (hex + human-readable format)  
✅ **QR Code Generation** - Automatic QR code generation per batch with public verification URL  
✅ **Supply Chain Tracking** - Track status: HARVESTED → STORED → TRANSPORTED → DELIVERED → SOLD  
✅ **Metadata Storage** - Store batch metadata in database with hash on blockchain  
✅ **Public Verification** - Public API endpoint for QR code scanning and verification  

---

## API Endpoints

### 1. Public QR Verification Endpoint

**GET** `/api/verify/:batchId`

Public endpoint for QR code scanning. Supports both human-readable batch IDs (`AGRI-2025-001`) and hex IDs (`0x...`).

**Response Format:**
```json
{
  "batchId": "AGRI-2025-001",
  "cropType": "Tomato",
  "farmName": "Green Valley Farm",
  "location": "Agra, India",
  "harvestDate": "2025-01-12",
  "currentStatus": "DELIVERED",
  "supplyChainHistory": [
    {
      "status": "HARVESTED",
      "timestamp": "2025-01-12",
      "actor": "Farmer"
    },
    {
      "status": "TRANSPORTED",
      "timestamp": "2025-01-14",
      "actor": "Distributor"
    }
  ],
  "blockchainVerified": true
}
```

**Example:**
```bash
# Using human-readable batch ID
curl https://api.example.com/api/verify/AGRI-2025-001

# Using hex batch ID
curl https://api.example.com/api/verify/0x1234...
```

---

### 2. QR Code Image Endpoint

**GET** `/api/verify/:batchId/qr`

Returns QR code image (PNG) that embeds the public verification URL.

**Example:**
```bash
curl https://api.example.com/api/verify/AGRI-2025-001/qr -o qrcode.png
```

---

### 3. Create Crop Batch

**POST** `/api/crops`  
**Auth:** Required (Farmer role)

Creates a crop batch with automatic generation of:
- Human-readable batch ID (AGRI-YYYY-XXX)
- QR code URL
- Metadata hash storage

**Request Body:**
```json
{
  "batchId": "0x...",  // Blockchain hex batch ID (from smart contract)
  "cropType": "Tomato",
  "quantityKg": 500,
  "harvestDate": "2025-01-12",
  "farmLocation": "Agra, India",
  "farmName": "Green Valley Farm",  // Optional
  "geoLocation": "27.1767°N, 78.0081°E",  // Optional
  "transactionHash": "0x...",  // Optional
  "metadataHash": "0x..."  // Optional - hash of metadata stored off-chain
}
```

**Response:**
```json
{
  "cropId": "0x...",
  "batchId": "0x...",
  "humanReadableBatchId": "AGRI-2025-001",
  "cropType": "Tomato",
  "quantityKg": 500,
  "harvestDate": "2025-01-12T00:00:00.000Z",
  "farmLocation": "Agra, India",
  "farmName": "Green Valley Farm",
  "transactionHash": "0x...",
  "metadataHash": "0x...",
  "qrCodeUrl": "https://api.example.com/api/verify/AGRI-2025-001"
}
```

---

### 4. Get QR Code Info

**GET** `/api/crops/:cropId/qr-code`  
**Auth:** Not required (public)

Returns QR code URL for a batch (supports both human-readable and hex IDs).

**Response:**
```json
{
  "batchId": "AGRI-2025-001",
  "qrCodeUrl": "https://api.example.com/api/verify/AGRI-2025-001",
  "verificationUrl": "https://api.example.com/api/verify/AGRI-2025-001"
}
```

---

### 5. Register Farmer on Blockchain

**POST** `/api/actors/register`  
**Auth:** Required

Registers a farmer (or other actor) on the blockchain.

**Request Body:**
```json
{
  "role": 1,  // 1=Farmer, 2=Buyer, 3=Distributor, 4=Retailer, 5=Inspector
  "name": "Green Valley Farm",
  "location": "Agra, India"
}
```

---

## Smart Contract Structure

### Batch Creation

The smart contract supports two methods:

1. **`createBatch()`** - Standard batch creation
2. **`createBatchWithMetadata()`** - Batch creation with metadata hash

```solidity
function createBatch(
    string calldata cropType,
    uint256 quantityKg,
    uint256 harvestDate,
    string calldata farmLocation
) external returns (bytes32);

function createBatchWithMetadata(
    string calldata cropType,
    uint256 quantityKg,
    uint256 harvestDate,
    string calldata farmLocation,
    bytes32 metadataHash
) external returns (bytes32);
```

### Batch Structure

```solidity
struct CropBatch {
    bytes32 batchId;
    address farmerAddress;
    string cropType;
    uint256 quantityKg;
    uint256 harvestDate;
    string farmLocation;
    bytes32 metadataHash;  // Hash of metadata stored off-chain
    BatchStage stage;
    address currentHolder;
    address buyerAddress;
    uint256 priceWei;
    bool paymentReleased;
    uint256 createdAt;
}
```

### Supply Chain Stages

```solidity
enum BatchStage {
    Created,        // HARVESTED
    QualityChecked, // HARVESTED (after inspection)
    InStorage,      // STORED
    InTransit,      // TRANSPORTED
    Delivered,      // DELIVERED
    Sold            // SOLD
}
```

---

## Database Schema

### Crop Model

```javascript
{
  cropId: String,              // Hex batch ID from blockchain
  batchId: String,             // Same as cropId (hex)
  humanReadableBatchId: String, // AGRI-YYYY-XXX format
  cropType: String,
  quantityKg: Number,
  harvestDate: Date,
  farmLocation: String,
  farmName: String,            // Farmer's farm name
  geoLocation: String,
  transactionHash: String,
  metadataHash: String,        // Hash stored on blockchain
  qrCodeUrl: String,           // Public verification URL
  createdBy: ObjectId,         // Reference to User
  walletAddress: String,
  // ... other fields
}
```

---

## QR Code Generation Logic

1. **When batch is created:**
   - Generate human-readable batch ID: `AGRI-YYYY-XXX`
   - Create verification URL: `{API_BASE_URL}/api/verify/{humanReadableBatchId}`
   - Store QR code URL in database

2. **QR Code Image:**
   - Endpoint: `/api/verify/:batchId/qr`
   - Generates PNG image embedding the verification URL
   - Can be scanned by any QR scanner app

3. **Verification Flow:**
   - User scans QR code → Gets URL
   - URL points to `/api/verify/:batchId`
   - Returns JSON with batch details, supply chain history, and verification status

---

## Blockchain Verification Logic

1. **Read batch from blockchain** using hex batch ID
2. **Compare blockchain data** with database records:
   - Crop type matches
   - Quantity matches
   - Harvest date matches
3. **Build supply chain history** from blockchain transfer records
4. **Map blockchain stages** to status format:
   - `Created` → `HARVESTED`
   - `QualityChecked` → `HARVESTED`
   - `InStorage` → `STORED`
   - `InTransit` → `TRANSPORTED`
   - `Delivered` → `DELIVERED`
   - `Sold` → `SOLD`
5. **Return verification result** with `blockchainVerified: true/false`

---

## Sample Data

Run the seed script to create sample crops:

```bash
cd backend
node scripts/seedSampleCrops.js
```

This creates 6 sample crops:
- Tomato (AGRI-2025-001) - Green Valley Farm, Agra
- Wheat (AGRI-2025-002) - Golden Fields Farm, Punjab
- Rice (AGRI-2025-003) - Misty Paddy Fields, West Bengal
- Potato (AGRI-2025-004) - Mountain Fresh Farm, Himachal Pradesh
- Corn (AGRI-2025-005) - Sunshine Crops, Maharashtra
- Soybean (AGRI-2025-006) - Organic Harvest Farm, Madhya Pradesh

Each crop includes:
- Human-readable batch ID
- QR code URL
- Farm name and location
- Metadata hash

---

## Environment Variables

**Backend `.env`:**
```env
PORT=4001
MONGODB_URI=mongodb://localhost:27017/agri-supply-chain
CONTRACT_ADDRESS=0x...
ETH_RPC_URL=http://127.0.0.1:8545
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:4001  # For QR code URLs
BACKEND_URL=http://localhost:4001   # Alternative
```

---

## Usage Flow

1. **Farmer Registration:**
   - Register on blockchain via `/api/actors/register`
   - Register in backend via `/api/auth/register`

2. **Create Batch:**
   - Call smart contract `createBatch()` → Get hex batch ID
   - Call `/api/crops` with hex batch ID → Get human-readable ID and QR code

3. **QR Code Scanning:**
   - Scan QR code → Opens verification URL
   - Public API returns batch details and verification status

4. **Supply Chain Updates:**
   - Update batch status via smart contract functions
   - Status automatically reflected in verification API

---

## Testing

```bash
# Test verification endpoint
curl http://localhost:4001/api/verify/AGRI-2025-001

# Get QR code image
curl http://localhost:4001/api/verify/AGRI-2025-001/qr -o qrcode.png

# Create batch (requires auth token)
curl -X POST http://localhost:4001/api/crops \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "0x...",
    "cropType": "Tomato",
    "quantityKg": 500,
    "harvestDate": "2025-01-12",
    "farmLocation": "Agra, India",
    "farmName": "Green Valley Farm"
  }'
```

---

## Complete System Architecture

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │
       │ HTTP/API
       │
┌──────▼──────────────────┐
│   Backend API           │
│   (Express/Node.js)     │
│                         │
│  - Auth                 │
│  - Batch Management     │
│  - QR Generation        │
│  - Verification API     │
└──────┬──────────┬───────┘
       │          │
       │          │
┌──────▼──┐  ┌────▼──────────┐
│ MongoDB │  │  Blockchain   │
│         │  │  (Ethereum)   │
│ - Users │  │               │
│ - Crops │  │ - Batches     │
│ - Events│  │ - Transfers   │
│         │  │ - Metadata    │
└─────────┘  └───────────────┘
```

---

## Summary

✅ **Complete backend system** with blockchain integration  
✅ **QR code generation** with public verification URLs  
✅ **Human-readable batch IDs** (AGRI-YYYY-XXX)  
✅ **Public verification API** matching exact JSON format  
✅ **Supply chain tracking** with status mapping  
✅ **Metadata hash storage** on blockchain  
✅ **Sample data script** for testing  

The system is production-ready and can be deployed to any hosting platform.
