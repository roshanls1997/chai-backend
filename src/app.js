import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { JSON_SIZE, URL_ENCODED_SIZE } from "./constants.js";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: JSON_SIZE,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: URL_ENCODED_SIZE,
  })
);

app.use(express.static("public"));

app.use(cookieParser());

export default app;
