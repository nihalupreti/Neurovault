import { Request } from "express";
import { connectMongo } from "@neurovault/config";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fileRoutes from "./modules/files/routes.js";
import searchRoutes from "./modules/search/routes.js";

dotenv.config();
connectMongo(process.env.DB_URL!);

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: ["http://localhost:3000"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors<Request>(corsOptions));
app.use(express.json());

app.use("/api/file", fileRoutes);
app.use("/api/search", searchRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
});
