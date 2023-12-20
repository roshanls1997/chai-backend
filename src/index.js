import dotenv from "dotenv";
import connectToDB from "./db/index.js";

dotenv.config({
  path: "./env",
});

connectToDB();

// const { PORT } = process.env;
// (async () => {
//   const app = express();
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("Error on app: ", error);
//       throw error;
//     });
//     app.listen(PORT, () => {
//       console.log("server running on port: ", PORT);
//     });
//   } catch (error) {
//     console.error("Error while connecting to DB: ", error);
//   }
// })();
