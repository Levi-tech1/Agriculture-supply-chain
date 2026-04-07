# Agricultural Supply Chain – Backend API

RESTful APIs for the Agricultural Supply Chain Management platform. JWT auth where noted.

## Base URL

- Local: `http://localhost:4001/api` (or `PORT` from env)

## Authentication

- **Register**: `POST /auth/register` – no auth
- **Login**: `POST /auth/login` – no auth
- **Protected routes**: send header `Authorization: Bearer <token>`

---

## Endpoints

### 1. Authentication & Authorization

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register user (email, password, walletAddress, role, name, location). Roles: farmer, transporter, warehouse, retailer, consumer, buyer, distributor, inspector. Admin cannot self-register. |
| POST | /auth/login | No | Login with email & password. Returns JWT and user. |
| PATCH | /auth/registered-on-chain | JWT | Mark user as registered on blockchain (after first on-chain tx). |

### 2. User Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users/me | JWT | Current user profile. |
| PATCH | /users/me | JWT | Update name, location. |
| GET | /users | Admin | List all users. |
| PATCH | /users/:userId | Admin | Update user role, kycStatus, verificationStatus. |

### 3. Crop Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /crops | JWT (Farmer) | Register crop batch. Body: batchId, cropType, quantityKg, harvestDate, farmLocation?, geoLocation?, transactionHash?. |
| GET | /crops | JWT | List crops (farmer: own only; others: all). |
| GET | /crops/:cropId | JWT | Get crop by ID (off-chain + on-chain if available). |
| GET | /crops/:cropId/history | JWT | Get supply chain events + blockchain transfers for crop. |

### 4. Batches (legacy / compatibility)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /batches | JWT (Farmer) | Register batchId in DB (body: batchId). |
| GET | /batches | JWT | List batches. |
| GET | /batches/:batchId | JWT | Batch details from blockchain. |

### 5. Supply Chain Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /supply-chain/event | JWT | Add lifecycle event. Body: cropId, eventType (Harvested, Stored, Transported, Delivered, QualityChecked, Listed, Sold), location?, txHash?, metadata?. Roles: farmer, transporter, warehouse, retailer, distributor, inspector, admin. |

### 6. Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /payments/release | JWT (Buyer/Consumer/Admin) | Record payment release for crop. Body: cropId, txHash?. On-chain release is done from frontend. |

### 7. Verification & QR (public / consumer)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /verify/:cropId | No | **Public.** Full traceability: batch, farmer, current holder, transfers from blockchain. |
| GET | /verify/:cropId/qr | No | **Public.** Returns PNG QR code image linking to verify page. |

### 8. Actors (blockchain)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /actors/me | JWT | Current wallet & role. |
| GET | /actors/:address | JWT | Get actor from blockchain by wallet address. |

---

## Role-Based Access (RBAC)

| Role | Crop create | Events | Payments release | Users (admin) |
|------|-------------|--------|------------------|---------------|
| farmer | ✓ | ✓ | | |
| transporter | | ✓ | | |
| warehouse | | ✓ | | |
| retailer | | ✓ | | |
| consumer | | | ✓ (read-only verify) | |
| buyer | | | ✓ | |
| admin | | ✓ | ✓ | ✓ |
| inspector | | ✓ | | |

---

## Security

- **Rate limiting**: 100 requests/minute per IP on /api.
- **Validation**: express-validator on inputs.
- **JWT**: 7-day expiry; secret from env.
- **CORS**: FRONTEND_URL (or default localhost:5173).

---

## Health

- **GET /health** – No auth. Returns `{ "ok": true }`.
