import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

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
    throw error;
  }
};

export default connectToDB;
