import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new MongoClient(process.env.MONGODB_URI);
async function run() {
  await client.connect();
  const db = client.db('tooprep');
  const jobs = await db.collection('ingestion_jobs').find({}).toArray();
  console.log(JSON.stringify(jobs, null, 2));
  await client.close();
}
run().catch(console.error);
