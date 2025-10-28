import express from "express";
import { handleSearch } from "./search-handler.js";

const router = express.Router();

router.get("/", handleSearch);

export default router;
