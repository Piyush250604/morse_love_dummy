require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'morsecode';

let client;
let db;

// Initialize MongoDB connection
async function connectToMongoDB() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('Attempting to connect to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('✅ Connected to MongoDB Atlas');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

async function startServer() {
  try {
    await connectToMongoDB();
    
    app.use(express.json());
    app.use(express.static(__dirname));

    // Health check endpoint (for frontend connectivity test)
    app.head('/api/reviews', (req, res) => {
      res.status(200).end();
    });

    app.get('/api/reviews', async (req, res) => {
      try {
        const reviewsCollection = db.collection('reviews');
        const result = await reviewsCollection.find().sort({ date: -1 }).toArray();
        res.json(result);
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
          date: new Date().toISOString(),
        };

        const reviewsCollection = db.collection('reviews');
        const result = await reviewsCollection.insertOne(newReview);
        res.status(201).json({ ...newReview, _id: result.insertedId });
      } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database: MongoDB (${MONGODB_DB})\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        if (client) await client.close();
        console.log('Connection closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
