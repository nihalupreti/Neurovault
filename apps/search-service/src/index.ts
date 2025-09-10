import { Request } from "express";
import cors from "cors";
import express from "express";
import searchRoutes from "./search/index.js";

const app = express();
const PORT = 3001;
const corsOptions = {
  origin: ["http://localhost:3000"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors<Request>(corsOptions));
app.use(express.json());

app.use("/api", searchRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
