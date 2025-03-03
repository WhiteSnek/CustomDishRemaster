import express, { Express } from "express";
import dotenv from "dotenv";
import couponRouter from './routes'
import connectDb from "./config";

dotenv.config({
  path: `./.env.${process.env.NODE_ENV}`
});

console.log(`Loaded .env.${process.env.NODE_ENV}`);

const app: Express = express();

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(couponRouter);

app.get('/',async(req,res)=>{
  res.send('Everything is fine!')
})

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 5001, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection error: ", err);
  });
