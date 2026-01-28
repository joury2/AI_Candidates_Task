//db.js
import dotenv from "dotenv";
dotenv.config();

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing");
}

// Create PostgreSQL connection pool with basic configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Test connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct');
    
    // Additional debugging for password-related errors
    if (err.message.includes('password')) {
      const url = new URL(process.env.DATABASE_URL);
      if (!url.password || url.password.trim() === '') {
        console.error('⚠️  Password is missing or empty in DATABASE_URL');
        console.error('   Please check your .env file and ensure the password is set correctly');
      } else {
        console.error('⚠️  Password authentication failed');
        console.error('   The password in DATABASE_URL may not match your PostgreSQL password');
        console.error('   Please verify your PostgreSQL password and update DATABASE_URL');
      }
    }
  }
})();