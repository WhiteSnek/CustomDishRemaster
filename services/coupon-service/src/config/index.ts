import mongoose from "mongoose";

const connectDb = async (): Promise<void> => {
    try {
      if(!process.env.MONGODB_URI){
        throw new Error('Mongodb url not defined')
      }
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected`);
    } catch (err) {
      console.log("MongoDb connection error: ", err);
      process.exit(1);
    }
  };


export default connectDb;