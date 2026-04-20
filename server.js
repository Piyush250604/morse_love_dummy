require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'reviews.db');

let db;

// Initialize SQLite database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('❌ Failed to open database:', err.message);
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database');
        
        // Create reviews table if it doesn't exist
        db.run(
          `CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            review TEXT NOT NULL,
            date TEXT NOT NULL
          )`,
          (err) => {
            if (err) {
              console.error('❌ Failed to create table:', err.message);
              reject(err);
            } else {
              console.log('✅ Reviews table ready');
              resolve();
            }
          }
        );
      }
    });
  });
}

async function startServer() {
  try {
    await initDatabase();
    
    app.use(express.json());
    app.use(express.static(__dirname));

    // Health check endpoint (for frontend connectivity test)
    app.head('/api/reviews', (req, res) => {
      res.status(200).end();
    });

    app.get('/api/reviews', (req, res) => {
      db.all('SELECT * FROM reviews ORDER BY date DESC', (err, rows) => {
        if (err) {
          console.error('Error fetching reviews:', err);
          return res.status(500).json({ error: 'Failed to fetch reviews' });
        }
        res.json(rows || []);
      });
    });

    app.post('/api/reviews', (req, res) => {
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

        db.run(
          'INSERT INTO reviews (name, rating, review, date) VALUES (?, ?, ?, ?)',
          [newReview.name, newReview.rating, newReview.review, newReview.date],
          function (err) {
            if (err) {
              console.error('Error saving review:', err);
              return res.status(500).json({ error: 'Failed to save review' });
            }
            res.status(201).json({ ...newReview, id: this.lastID });
          }
        );
      } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database: SQLite (${DB_FILE})\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        db.close((err) => {
          if (err) console.error(err);
          console.log('Database connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
