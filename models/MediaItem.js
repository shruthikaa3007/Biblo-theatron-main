import mongoose from 'mongoose';

// Based on types.ts
const MediaItemSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { type: String, enum: ['movie', 'book'], required: true },
  title: { type: String, required: true },
  genres: [String],
  status: { type: String, enum: ['watched', 'read', 'to-watch', 'to-read'], required: true },
  rating: { type: Number, default: null },
  api_id: { type: String, required: true },
  posterUrl: { type: String, required: true },
  description: { type: String, required: true },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    // Map _id to id when converting to JSON (like res.json())
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  },
  toObject: {
    // Map _id to id when converting to a plain object
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
    getters: true
  }
});

// Handle Mongoose's singular/plural collection naming
const MediaItem = mongoose.model('MediaItem', MediaItemSchema, 'mediaitems');

export default MediaItem;
