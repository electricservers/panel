// src/lib/db.ts
import mongoose from 'mongoose';
import { MONGODB_URI } from '$env/static/private';

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}