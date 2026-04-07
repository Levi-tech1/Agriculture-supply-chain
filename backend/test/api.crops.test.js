import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import cors from "cors";
import User from "../src/models/User.js";
import Crop from "../src/models/Crop.js";
import cropRoutes from "../src/routes/crops.js";
import { attachSessionUser } from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/error.js";

let mongoServer;
let app;
let farmerId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/crops", attachSessionUser, cropRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
  const user = await User.create({
    email: "cropfarmer@test.com",
    password: "$2a$10$dummy",
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    role: "farmer",
    name: "Crop Farmer",
    location: "Kansas",
    chainRole: 1,
  });
  farmerId = user._id.toString();
  process.env.DEFAULT_USER_ID = farmerId;
});

describe("Crops API", () => {
  describe("POST /api/crops", () => {
    it("should create crop (farmer)", async () => {
      const batchId = "0x" + "a".repeat(64);
      const res = await request(app).post("/api/crops").send({
        batchId,
        cropType: "Wheat",
        quantityKg: 5000,
        harvestDate: "2025-01-15T00:00:00.000Z",
        farmLocation: "Kansas",
        geoLocation: "39.1,-94.5",
        transactionHash: "0xtx123",
      });
      expect(res.status).toBe(201);
      expect(res.body.cropId).toBe(batchId);
      expect(res.body.cropType).toBe("Wheat");
      expect(res.body.quantityKg).toBe(5000);
      expect(res.body.transactionHash).toBe("0xtx123");
    });

    it("should reject non-farmer", async () => {
      const buyer = await User.create({
        email: "buyer@test.com",
        password: "$2a$10$dummy",
        walletAddress: "0xbuyer12345678901234567890123456789012",
        role: "consumer",
        name: "Buyer",
        location: "",
        chainRole: 2,
      });
      const prev = process.env.DEFAULT_USER_ID;
      process.env.DEFAULT_USER_ID = buyer._id.toString();
      try {
        const res = await request(app).post("/api/crops").send({
          batchId: "0x" + "b".repeat(64),
          cropType: "Rice",
          quantityKg: 100,
          harvestDate: "2025-02-01",
        });
        expect(res.status).toBe(403);
      } finally {
        process.env.DEFAULT_USER_ID = prev;
      }
    });
  });

  describe("GET /api/crops", () => {
    it("should list crops for farmer", async () => {
      const batchId = "0x" + "c".repeat(64);
      await Crop.create({
        cropId: batchId,
        batchId,
        cropType: "Corn",
        quantityKg: 3000,
        harvestDate: new Date(),
        createdBy: (await User.findOne({ email: "cropfarmer@test.com" }))._id,
        walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
      });
      const res = await request(app).get("/api/crops");
      expect(res.status).toBe(200);
      expect(res.body.crops).toHaveLength(1);
      expect(res.body.crops[0].cropType).toBe("Corn");
    });
  });
});
