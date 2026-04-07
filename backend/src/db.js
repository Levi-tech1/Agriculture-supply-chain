import mongoose from "mongoose";

let memoryServer;
const isVercel = process.env.VERCEL === "1";

/** Single in-flight connect so concurrent callers (e.g. index.js + ensureDb) do not double-connect. */
let pendingConnect = null;

async function startMemoryServer() {
  if (isVercel) {
    throw new Error("In-memory MongoDB is not supported on Vercel. Set MONGODB_URI (e.g. MongoDB Atlas) in project Environment Variables.");
  }
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    return memoryServer.getUri();
  } catch (err) {
    console.warn("In-memory MongoDB failed:", err.message);
    throw new Error(
      "Could not start database. If you set MONGODB_URI, ensure MongoDB is running. Otherwise ensure mongodb-memory-server can run (npm install in backend)."
    );
  }
}

async function performConnect() {
  const uri = process.env.MONGODB_URI?.trim();
  if (isVercel && (!uri || uri === "memory")) {
    throw new Error("MONGODB_URI is required on Vercel. Add it in Vercel Project Settings → Environment Variables (e.g. MongoDB Atlas connection string).");
  }

  const useMemory = !uri || uri === "memory";

  if (useMemory) {
    const memoryUri = await startMemoryServer();
    await mongoose.connect(memoryUri);
    console.log("MongoDB (in-memory) started – no install needed");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    if (isVercel) throw err;
    console.warn("MongoDB connection failed:", err.message);
    console.log("Falling back to in-memory MongoDB (data resets on restart)...");
    const memoryUri = await startMemoryServer();
    await mongoose.connect(memoryUri);
    console.log("MongoDB (in-memory) connected");
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!pendingConnect) {
    pendingConnect = performConnect().finally(() => {
      pendingConnect = null;
    });
  }
  await pendingConnect;
}
