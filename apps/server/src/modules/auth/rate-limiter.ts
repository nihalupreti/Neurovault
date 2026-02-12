import type { Request, Response, NextFunction } from "express";
import { UsageCounter } from "./usage-counter.model.js";

const GUEST_PER_IP_DAILY = 5;
const GUEST_GLOBAL_DAILY = 30;

export function rateLimiter() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.role === "admin") return next();

    const today = new Date().toISOString().slice(0, 10);
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    const [ipCounter, globalCounter] = await Promise.all([
      UsageCounter.findOneAndUpdate(
        { ip, date: today },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      ),
      UsageCounter.findOneAndUpdate(
        { ip: "_global", date: today },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      ),
    ]);

    if (ipCounter.count > GUEST_PER_IP_DAILY || globalCounter.count > GUEST_GLOBAL_DAILY) {
      await Promise.all([
        UsageCounter.updateOne({ ip, date: today }, { $inc: { count: -1 } }),
        UsageCounter.updateOne({ ip: "_global", date: today }, { $inc: { count: -1 } }),
      ]);

      return res.status(429).json({
        limited: true,
        message: "Daily limit reached",
        remaining: 0,
        contact: {
          email: process.env.CONTACT_EMAIL || "",
          linkedin: process.env.CONTACT_LINKEDIN || "",
        },
      });
    }

    next();
  };
}
