require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
<<<<<<< HEAD
=======
const fs = require('fs');
>>>>>>> parent of dce7858 (update3)
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
<<<<<<< HEAD
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'morsecode';

=======

// Try Atlas first, fallback to local MongoDB, then use JSON file storage
const ATLAS_URI = process.env.MONGODB_URI;
const LOCAL_URI = 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'morsecode';
const JSON_DB_FILE = path.join(__dirname, 'reviews.json');

>>>>>>> parent of dce7858 (update3)
let client;
let db;
let useJsonStorage = false;
let reviews = [];

<<<<<<< HEAD
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
=======
// Load reviews from JSON file
function loadReviewsFromFile() {
  try {
    if (fs.existsSync(JSON_DB_FILE)) {
      const data = fs.readFileSync(JSON_DB_FILE, 'utf8');
      reviews = JSON.parse(data);
    } else {
      reviews = [];
    }
  } catch (error) {
    console.log('Error loading reviews from file:', error.message);
    reviews = [];
  }
}

// Save reviews to JSON file
function saveReviewsToFile() {
  try {
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(reviews, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving reviews to file:', error);
  }
}

async function connectToMongoDB() {
  // Try Atlas first
  if (ATLAS_URI) {
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      client = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log('✅ Connected to MongoDB Atlas');
      return true;
    } catch (atlasError) {
      console.log('❌ MongoDB Atlas connection failed:', atlasError.message);
    }
  }

  // Fallback to local MongoDB
  try {
    console.log('Attempting to connect to local MongoDB...');
    client = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('✅ Connected to local MongoDB');
    return true;
  } catch (localError) {
    console.log('❌ Local MongoDB connection failed:', localError.message);
  }

  // Fallback to JSON file storage
  console.log('📄 Using JSON file storage (development mode)');
  useJsonStorage = true;
  loadReviewsFromFile();
  return true;
>>>>>>> parent of dce7858 (update3)
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
<<<<<<< HEAD
        const reviewsCollection = db.collection('reviews');
        const result = await reviewsCollection.find().sort({ date: -1 }).toArray();
=======
        let result = [];
        
        if (useJsonStorage) {
          result = reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
          const reviewsCollection = db.collection('reviews');
          result = await reviewsCollection.find().sort({ date: -1 }).toArray();
        }
        
>>>>>>> parent of dce7858 (update3)
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
          status: 'pending',
        };

<<<<<<< HEAD
        const reviewsCollection = db.collection('reviews');
        const result = await reviewsCollection.insertOne(newReview);
        res.status(201).json({ ...newReview, _id: result.insertedId });
=======
        if (useJsonStorage) {
          reviews.push(newReview);
          saveReviewsToFile();
          res.status(201).json(newReview);
        } else {
          const reviewsCollection = db.collection('reviews');
          const result = await reviewsCollection.insertOne(newReview);
          res.status(201).json({ ...newReview, _id: result.insertedId });
        }
>>>>>>> parent of dce7858 (update3)
      } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });

    const server = app.listen(PORT, () => {
      const dbType = useJsonStorage ? 'JSON File (Development)' : 'MongoDB';
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
<<<<<<< HEAD
      console.log(`📊 Database: MongoDB (${MONGODB_DB})\n`);
=======
      console.log(`📊 Database: ${dbType}\n`);
>>>>>>> parent of dce7858 (update3)
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
