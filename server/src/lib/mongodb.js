import { MongoClient } from 'mongodb';

let clientPromise;

function getConnectionString() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri === 'your-mongodb-uri-here') {
    const error = new Error('MongoDB is not configured. Set MONGODB_URI before using content APIs.');
    error.statusCode = 503;
    throw error;
  }
  return uri;
}

/**
 * Lazy connection: student routes can start and run without MongoDB while the
 * future content subsystem is intentionally disabled. The client is shared by
 * content API calls and the later worker process.
 */
export async function getMongoDb() {
  if (!clientPromise) {
    const client = new MongoClient(getConnectionString(), {
      serverSelectionTimeoutMS: 5_000
    });
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'tooprep');
}

export async function closeMongoConnection() {
  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
  clientPromise = undefined;
}
