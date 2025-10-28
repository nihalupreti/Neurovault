import mongoose, { Mongoose } from "mongoose";

let mongoClient: Mongoose | null = null;

/**
 * Connect to MongoDB
 * @param uri MongoDB connection URI
 */
export async function connectMongo(uri: string): Promise<Mongoose> {
  if (mongoClient) return mongoClient;

  try {
    mongoClient = await mongoose.connect(uri);

    console.log("MongoDB connected successfully.");
    return mongoClient;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

/**
 * Get the existing MongoDB client
 * Throws if connectMongo has not been called
 */
export function getMongoClient(): Mongoose {
  if (!mongoClient) {
    throw new Error(
      "MongoDB client is not initialized. Call connectMongo first."
    );
  }
  return mongoClient;
}
