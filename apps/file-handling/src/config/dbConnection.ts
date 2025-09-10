import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL!);
    console.log("Connected to the DB");
  } catch (error) {
    console.log(
      "Some error occured while trying to connect to the database.",
      error
    );
  }
};
