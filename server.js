import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import MediaItem from './models/MediaItem.js'; s

// --- Server & Environment Setup ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001; 
app.use(cors());
app.use(express.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MongoDB Connection ---
const mongoUri = process.env.NODE_ENV === 'docker' 
  ? process.env.MONGODB_URI_DOCKER 
  : process.env.MONGODB_URI_LOCAL;

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Endpoints ---

// GET all media items
app.get('/api/media', async (req, res) => {
  try {
    const items = await MediaItem.find();
    // Map _id to id for frontend compatibility
    res.json(items.map(item => item.toObject({ getters: true })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching media items' });
  }
});

// POST a new media item
app.post('/api/media', async (req, res) => {
  try {
    // Hardcoding user_id as 'user1' since we don't have auth
    const newItem = new MediaItem({ ...req.body, user_id: 'user1' });
    await newItem.save();
    res.status(201).json(newItem.toObject({ getters: true }));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error adding media item' });
  }
});

// DELETE a media item
app.delete('/api/media/:id', async (req, res) => {
  try {
    const deletedItem = await MediaItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

// PUT (Update) an item's status
app.put('/api/media/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedItem = await MediaItem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true } // Return the updated document
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(updatedItem.toObject({ getters: true }));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating status' });
  }
});

// PUT (Update) an item's rating
app.put('/api/media/:id/rating', async (req, res) => {
  try {
    const { rating } = req.body;
    const updatedItem = await MediaItem.findByIdAndUpdate(
      req.params.id,
      { rating },
      { new: true } // Return the updated document
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(updatedItem.toObject({ getters: true }));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating rating' });
  }
});

// --- Serve Frontend ---
// In production (e.g., Docker), serve the built React app
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'docker') {
  const buildPath = path.join(__dirname, 'dist');
  app.use(express.static(buildPath));

  // Serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
