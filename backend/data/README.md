# Sample crop batches

**File:** `sample-batches.json`

Sample agricultural crop batches for the Agricultural Supply Chain Management System. Used for:

- Backend testing and API demos
- UI display when no real batches exist (`GET /api/sample-batches`)
- Optional DB seeding via `node scripts/seedSampleBatches.js`

## Fields per batch

| Field | Description |
|-------|-------------|
| batchId | Unique ID (e.g. sample-001) |
| farmerName | Farmer name (realistic, not real) |
| cropName | Crop name (e.g. Wheat, Rice) |
| cropCategory | grain / vegetable / fruit / cash crop |
| quantityKg | Quantity in kg |
| harvestDate | ISO date (YYYY-MM-DD) |
| farmLocation | State, District (Indian regions) |
| qualityGrade | A / A+ / B / B+ |
| supplyChainStatus | Harvested / Stored / In Transit / Delivered |
| expectedMarketPriceRupees | Expected market price (₹) |

## API

- **GET /api/sample-batches** – Returns `{ batches: [...], count: N }` (no auth required).

## Seeding into DB

From `backend` folder:

```bash
MONGODB_URI=memory node scripts/seedSampleBatches.js
```

Creates a seed farmer (`farmer@sample.com` / `SampleFarmer@123`) and Batch + Crop documents with generated hex batch IDs so they appear in `GET /api/batches` and `GET /api/crops`.
