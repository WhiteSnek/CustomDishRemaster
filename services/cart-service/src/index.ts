import express, {Express} from 'express'
import dotenv from 'dotenv'
import cartRouter from './routes'
import cookieParser from 'cookie-parser'

dotenv.config({
    path: './env'
})

const app: Express = express()

app.use(express.json({limit: "16kb"}))

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

app.use(cartRouter);

app.get('/',async(req,res)=>{
  res.send('Everything is fine!')
})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});