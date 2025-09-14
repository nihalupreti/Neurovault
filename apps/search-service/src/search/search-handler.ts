import { Request, Response } from "express";

import { searchSimilarContent } from "./search-service.js";

export const handleSearch = async (req: Request, res: Response) => {
  const { query } = req.body;
  searchSimilarContent(query);
  res.status(200).json({ success: "ok" });
};
