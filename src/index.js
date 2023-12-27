import dotenv from "dotenv";
import connectToDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
  path: "./env",
});

const PORT = process.env.PORT || 8000;
connectToDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server is running on PORT: ", PORT);
    });
    app.on("error", (error) => {
      console.log("ERROR ON THE APP: ", error);
    });
  })
  .catch((error) => {
    console.log("FAILED TO CONNECT TO DB: ", error);
  });

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
