import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import userRouter from "./routes";
import cookieParser from "cookie-parser";
import connectDb from "./config";

dotenv.config();

const app: Express = express();

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use("/api/v1/users", userRouter);

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 3001, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection error: ", err);
  });
