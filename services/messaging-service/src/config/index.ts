import mongoose from "mongoose";

const connectDb = async (): Promise<void> => {
    try {
      await mongoose.connect(`${process.env.MONGODB_URI}/customDish?authSource=admin`);
      console.log(`MongoDB Connected`);
    } catch (err) {
      console.log("MongoDb connection error: ", err);
      process.exit(1);
    }
  };


export default connectDb;