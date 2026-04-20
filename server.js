require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection configuration
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'morse_reviews',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Initialize MySQL database
async function initDatabase() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    const connection = await pool.getConnection();
    
    console.log('✅ Connected to MySQL database');
    
    // Create reviews table if it doesn't exist
    await connection.query(
      `CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rating INT NOT NULL,
        review LONGTEXT NOT NULL,
        date DATETIME NOT NULL
      )`
    );
    
    console.log('✅ Reviews table ready');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    throw error;
  }
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

    app.get('/api/reviews', async (req, res) => {
      try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM reviews ORDER BY date DESC');
        connection.release();
        res.json(rows || []);
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

        const connection = await pool.getConnection();
        const [result] = await connection.query(
          'INSERT INTO reviews (name, rating, review, date) VALUES (?, ?, ?, ?)',
          [newReview.name, newReview.rating, newReview.review, newReview.date]
        );
        connection.release();
        
        res.status(201).json({ ...newReview, id: result.insertId });
      } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Failed to save review' });
      }
    });

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database: MySQL (${DB_CONFIG.host}:${DB_CONFIG.database})\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        if (pool) await pool.end();
        console.log('Database connection closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
