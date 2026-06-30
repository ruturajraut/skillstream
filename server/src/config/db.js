// server/src/config/db.js
import pg from 'pg';
import { MongoClient } from 'mongodb';
import env from './env.js';

// PostgreSQL pool (connection pooling)
const pgPool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 5, // limit connections (Neon free tier is generous, but we keep it small for dev)
  idleTimeoutMillis: 30000,
});

// MongoDB client (single connection recommended for most apps)
const mongoClient = new MongoClient(env.mongoUri);

let mongoDb = null; // will hold the db instance after connection

/**
 * Connect to PostgreSQL and test connection.
 */
async function connectPostgres() {
  try {
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1); // fail fast
  }
}

/**
 * Connect to MongoDB and test connection.
 */
async function connectMongo() {
  try {
    await mongoClient.connect();
    mongoDb = mongoClient.db(); // uses the database from connection string (or you can pass 'skillstream')
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Initialize both databases.
 */
export async function initDatabases() {
  await connectPostgres();
  await connectMongo();
}

// Export query helper for PostgreSQL (so we don't have to deal with pool everywhere)
export function query(sql, params) {
  return pgPool.query(sql, params);
}

// Export MongoDB database instance for direct use
export function getMongoDb() {
  if (!mongoDb) {
    throw new Error('MongoDB not initialized. Call initDatabases() first.');
  }
  return mongoDb;
}

// Graceful shutdown helpers (optional for now)
export async function closeDatabases() {
  await pgPool.end();
  await mongoClient.close();
}