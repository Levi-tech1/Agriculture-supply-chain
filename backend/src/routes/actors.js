import { Router } from "express";
import { attachSessionUser } from "../middleware/auth.js";
import { readActor } from "../config/blockchain.js";

const router = Router();

router.use(attachSessionUser);

router.get("/me", (req, res) => {
  res.json({ walletAddress: req.walletAddress, role: req.role });
});

router.get("/:address", async (req, res, next) => {
  try {
    const address = req.params.address;
    if (!address || address.length < 40) return res.status(400).json({ error: "Invalid address" });
    const data = await readActor(address);
    if (!data.registered) return res.status(404).json({ error: "Actor not registered on chain" });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
