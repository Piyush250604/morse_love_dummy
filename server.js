require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'morsecode';

const client = new MongoClient(MONGODB_URI);

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(MONGODB_DB);
    const reviewsCollection = db.collection('reviews');

    app.use(express.json());
    app.use(express.static(__dirname));

    app.get('/api/reviews', async (req, res) => {
      const reviews = await reviewsCollection.find().sort({ date: -1 }).toArray();
      res.json(reviews);
    });

    app.post('/api/reviews', async (req, res) => {
      const { name, rating, review } = req.body;
      if (!name || !rating || !review) {
        return res.status(400).json({ error: 'Please provide name, rating, and review.' });
      }

      const newReview = {
        name: name.trim(),
        rating: Number(rating),
        review: review.trim(),
        date: new Date(),
      };

      const result = await reviewsCollection.insertOne(newReview);
      res.status(201).json({ ...newReview, _id: result.insertedId });
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();
