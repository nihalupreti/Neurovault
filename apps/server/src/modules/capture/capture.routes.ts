import { Router } from "express";
import { handleCapture } from "./capture.handler.js";
import { asHandler } from "../../utils/as-handler.js";

const router = Router();

router.post("/", asHandler(handleCapture));

export default router;
