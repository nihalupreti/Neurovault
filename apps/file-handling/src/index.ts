import { Request } from "express";
import { connectDB } from "./config/dbConnection.js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import uploadRoutes from "./files/index.js";

dotenv.config();
connectDB();

const app = express();
const PORT = 3002;
const corsOptions = {
  origin: ["http://localhost:3000"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors<Request>(corsOptions));
app.use(express.json());

app.use("/api", uploadRoutes);

app.listen(PORT, () => {
  console.log(`file handling is running on port ${PORT}`);
});
