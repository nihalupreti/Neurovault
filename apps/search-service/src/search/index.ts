import express from "express";
import { handleSearch } from "./search-handler.js";

const router = express.Router();

router.post("/search", handleSearch);

export default router;
