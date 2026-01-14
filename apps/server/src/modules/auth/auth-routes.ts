import express from "express";
import type { Request, Response } from "express";
import { UsageCounter } from "./usage-counter.model.js";

const router = express.Router();

router.post("/login", (req: Request, res: Response) => {
  const { secret } = req.body as { secret?: string };

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true });
});

router.get("/usage", async (req: Request, res: Response) => {
  if (req.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [globalDoc, allIpDocs] = await Promise.all([
    UsageCounter.findOne({ ip: "_global", date: today }),
    UsageCounter.find({ date: today, ip: { $ne: "_global" } }),
  ]);

  const guestTotal = globalDoc?.count ?? 0;

  return res.json({
    today: { guest: guestTotal, admin: 0, global: guestTotal },
    limits: { perIp: 5, globalDaily: 30 },
    uniqueVisitors: allIpDocs.length,
  });
});

export default router;
