require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Try Atlas first, fallback to local MongoDB
const ATLAS_URI = process.env.MONGODB_URI;
const LOCAL_URI = 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'morsecode';

let client;
let db;

async function connectToMongoDB() {
  // Try Atlas first
  if (ATLAS_URI) {
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      client = new MongoClient(ATLAS_URI);
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log('✅ Connected to MongoDB Atlas');
      return;
    } catch (atlasError) {
      console.log('❌ MongoDB Atlas connection failed:', atlasError.message);
    }
  }

  // Fallback to local MongoDB
  try {
    console.log('Attempting to connect to local MongoDB...');
    client = new MongoClient(LOCAL_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('✅ Connected to local MongoDB');
  } catch (localError) {
    console.error('❌ Local MongoDB connection failed:', localError.message);
    throw new Error('Could not connect to any MongoDB instance');
  }
}

async function startServer() {
  try {
    await connectToMongoDB();
    const reviewsCollection = db.collection('reviews');

    app.use(express.json());
    app.use(express.static(__dirname));

    // Health check endpoint (for frontend connectivity test)
    app.head('/api/reviews', (req, res) => {
      res.status(200).end();
    });

    app.get('/api/reviews', async (req, res) => {
      try {
        const reviews = await reviewsCollection.find().sort({ date: -1 }).toArray();
        res.json(reviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
      }
    });

    app.post('/api/reviews', async (req, res) => {
      try {
        const { name, rating, review } = req.body;

        // Validation
        if (!name || !rating || !review) {
          return res.status(400).json({ error: 'Please provide name, rating, and review.' });
        }

        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        const newReview = {
          name: name.trim(),
          rating: ratingNum,
          review: review.trim(),
          date: new Date(),
        };

        const result = await reviewsCollection.insertOne(newReview);
        res.status(201).json({ ...newReview, _id: result.insertedId });
      } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database: ${MONGODB_DB}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        if (client) await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
