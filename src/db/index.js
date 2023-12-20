import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";

dotenv.config({
  path: "../.env",
});

const connectToDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `Connected to DB :: HOST: `,
      connectionInstance.connection.host
    );
  } catch (error) {
    console.log(`DB connection FAILED: `, error);
    process.exit(1);
  }
};

export default connectToDB;
