import express from "express";
import type { Request, Response } from "express";
import { UsageCounter } from "./auth.usage.model.js";
import { apiSuccess } from "../../utils/api-response.js";
import { UnauthorizedError } from "../../errors/app-error.js";
import { InvalidCredentialsError } from "./auth.errors.js";
import { asHandler } from "../../utils/as-handler.js";

const router = express.Router();

router.post(
  "/login",
  asHandler((req: Request, res: Response) => {
    const { secret } = req.body as { secret?: string };

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      throw new InvalidCredentialsError();
    }

    apiSuccess(res, { authenticated: true });
  }),
);

router.get(
  "/usage",
  asHandler(async (req: Request, res: Response) => {
    if (req.role !== "admin") {
      throw new UnauthorizedError();
    }

    const today = new Date().toISOString().slice(0, 10);

    const [globalDoc, allIpDocs] = await Promise.all([
      UsageCounter.findOne({ ip: "_global", date: today }),
      UsageCounter.find({ date: today, ip: { $ne: "_global" } }),
    ]);

    const guestTotal = globalDoc?.count ?? 0;

    apiSuccess(res, {
      today: { guest: guestTotal, admin: 0, global: guestTotal },
      limits: { perIp: 5, globalDaily: 30 },
      uniqueVisitors: allIpDocs.length,
    });
  }),
);

export default router;
