import express, { Express } from "express";
import dotenv from "dotenv";
import reviewRouter from './routes'
import connectDb from "./config";

dotenv.config({
  path: `./.env`
});


const app: Express = express();

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(reviewRouter);

app.get('/',async(req,res)=>{
  res.send('Everything is fine!')
})

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 5002, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection error: ", err);
  });
