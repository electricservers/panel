import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    steamId: String,
    role: String
});

export const User = mongoose.model('User', UserSchema);
