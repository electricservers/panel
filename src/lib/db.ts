import mongoose from 'mongoose';
import { env } from '$env/dynamic/private';

export async function connectToDatabase() {
  const mongoUri = env.MONGODB_URI;

  if (!mongoUri) {
    const message = 'Missing MONGODB_URI. Please set the MONGODB_URI environment variable (e.g. mongodb://user:pass@mongo:27017/panel?authSource=admin)';
    console.error(message);
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // do not crash the app; routes depending on Mongo will fail when accessed
    return;
  }
}
