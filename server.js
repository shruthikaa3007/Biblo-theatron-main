import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// FIX: Import the 'fs' module
import fs from 'fs';
// FIX: Removed stray 's' from the end of this line
import MediaItem from './models/MediaItem.js';

// --- Server & Environment Setup ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MongoDB Connection ---
// FIX: Directly use the MONGODB_URI from the .env file
const mongoUri = process.env.MONGODB_URI;

// Add a check to ensure the URI is loaded
if (!mongoUri) {
  console.error("Error: MONGODB_URI environment variable not set. Make sure it's in your .env file.");
  process.exit(1); // Exit if the database URI is missing
}

// Increased connection timeout for potentially slower connections
const mongooseOptions = {
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
};

mongoose.connect(mongoUri, mongooseOptions)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
      // Log the specific error for debugging
      console.error('Initial MongoDB connection error:', err.name, err.message);
      // Don't exit immediately, let connection retries happen in background if configured
      // process.exit(1);
  });

// --- API Endpoints ---

// GET all media items
app.get('/api/media', async (req, res) => {
  // Check connection status before querying
  if (mongoose.connection.readyState !== 1) { // 1 === connected
    console.error("GET /api/media error: Not connected to MongoDB.");
    return res.status(503).json({ message: 'Database not available. Please try again later.' });
  }
  try {
    // Added sort to get newest first by default, matching frontend expectation
    const items = await MediaItem.find().sort({ createdAt: -1 });
    // Map _id to id for frontend compatibility
    res.json(items.map(item => item.toObject({ getters: true })));
  } catch (err) {
    console.error("Error in GET /api/media:", err); // Add more specific logging
    res.status(500).json({ message: 'Error fetching media items' });
  }
});

// POST a new media item
app.post('/api/media', async (req, res) => {
   // Check connection status before querying
  if (mongoose.connection.readyState !== 1) {
    console.error("POST /api/media error: Not connected to MongoDB.");
    return res.status(503).json({ message: 'Database not available. Please try again later.' });
  }
  try {
    // Hardcoding user_id as 'user1' since we don't have auth
    const newItem = new MediaItem({ ...req.body, user_id: 'user1' });
    await newItem.save();
    res.status(201).json(newItem.toObject({ getters: true }));
  } catch (err) {
    console.error("Error in POST /api/media:", err); // Add more specific logging
    // Check for validation errors specifically
    if (err.name === 'ValidationError') {
        // Log validation errors for easier debugging
        console.error("Validation Errors:", err.errors);
        return res.status(400).json({ message: 'Validation Error', errors: err.errors });
    }
    res.status(500).json({ message: 'Error adding media item' }); // Use 500 for other server errors
  }
});

// DELETE a media item
app.delete('/api/media/:id', async (req, res) => {
   // Check connection status before querying
  if (mongoose.connection.readyState !== 1) {
    console.error(`DELETE /api/media/${req.params.id} error: Not connected to MongoDB.`);
    return res.status(503).json({ message: 'Database not available. Please try again later.' });
  }
  try {
    // Validate if the ID is a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid item ID format' });
    }
    const deletedItem = await MediaItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(`Error in DELETE /api/media/${req.params.id}:`, err); // Add more specific logging
    res.status(500).json({ message: 'Error deleting item' });
  }
});

// PUT (Update) an item's status
app.put('/api/media/:id/status', async (req, res) => {
   // Check connection status before querying
  if (mongoose.connection.readyState !== 1) {
    console.error(`PUT /api/media/${req.params.id}/status error: Not connected to MongoDB.`);
    return res.status(503).json({ message: 'Database not available. Please try again later.' });
  }
  try {
     // Validate if the ID is a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid item ID format' });
    }
    const { status } = req.body;
    // Optional: Add validation for the status value if needed
    const updatedItem = await MediaItem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(updatedItem.toObject({ getters: true }));
  } catch (err) {
    console.error(`Error in PUT /api/media/${req.params.id}/status:`, err); // Add more specific logging
     // Check for validation errors specifically
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: err.errors });
    }
    res.status(500).json({ message: 'Error updating status' }); // Use 500 for other server errors
  }
});

// PUT (Update) an item's rating
app.put('/api/media/:id/rating', async (req, res) => {
   // Check connection status before querying
  if (mongoose.connection.readyState !== 1) {
    console.error(`PUT /api/media/${req.params.id}/rating error: Not connected to MongoDB.`);
    return res.status(503).json({ message: 'Database not available. Please try again later.' });
  }
  try {
     // Validate if the ID is a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid item ID format' });
    }
    const { rating } = req.body;
     // Optional: Add validation for the rating value if needed
    const updatedItem = await MediaItem.findByIdAndUpdate(
      req.params.id,
      { rating },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(updatedItem.toObject({ getters: true }));
  } catch (err) {
    console.error(`Error in PUT /api/media/${req.params.id}/rating:`, err); // Add more specific logging
     // Check for validation errors specifically
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: err.errors });
    }
    res.status(500).json({ message: 'Error updating rating' }); // Use 500 for other server errors
  }
});

// --- Serve Frontend ---
// Serve the built React app files only if not in local development mode
// The NODE_ENV check handles both Docker ('docker') and potentially other production environments ('production')
if (process.env.NODE_ENV !== 'development') {
  const buildPath = path.join(__dirname, 'dist');

  // Check if the build directory exists
  // This helps prevent errors if the build hasn't run yet
  try {
      // Use fs.existsSync (synchronous) here as it's part of server startup
      if (fs.existsSync(buildPath)) {
          console.log(`Serving static files from: ${buildPath}`);
          app.use(express.static(buildPath));

          // Serve index.html for all other routes (SPA fallback)
          app.get('*', (req, res) => {
            const indexPath = path.join(buildPath, 'index.html');
            // Check if index.html exists within the build path
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                console.error(`index.html not found at ${indexPath}`);
                res.status(404).send('Frontend index.html not found. Build may be missing.');
            }
          });
      } else {
          console.warn(`WARN: Frontend build directory not found at ${buildPath}. Frontend will not be served by this server.`);
          // Optionally, add a placeholder route for the root path
          app.get('/', (req, res) => {
              res.send('Backend server is running, but frontend build is missing.');
          });
      }
  } catch (err) {
      console.error('Error checking or serving static files:', err);
      // Fallback for safety
       app.get('/', (req, res) => {
            res.status(500).send('Error initializing static file serving.');
       });
  }
} else {
    console.log("Running in development mode. Frontend should be served by Vite dev server.");
    // Optional: Add a placeholder route for the root path in development
     app.get('/', (req, res) => {
        res.send('Backend server running in development mode.');
     });
}


app.listen(PORT, '0.0.0.0', () => { // Listen on all network interfaces
  console.log(`Server running on port ${PORT}`);
  // Log NODE_ENV during startup for clarity
  console.log(`NODE_ENV is set to: ${process.env.NODE_ENV || 'undefined (defaulting to development logic)'}`);
});

// Add more detailed Mongoose connection event listeners
mongoose.connection.on('error', err => {
  console.error('MongoDB runtime connection error:', err.name, err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected.');
});

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT received. Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed. Exiting.');
    process.exit(0);
});

