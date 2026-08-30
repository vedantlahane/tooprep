import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new MongoClient(process.env.MONGODB_URI);
async function run() {
  await client.connect();
  const db = client.db('tooprep');
  const c = await db.collection('extracted_candidates').find({}).toArray();
  console.log(`Found ${c.length} candidates`);
  if (c.length > 0) {
    console.log(JSON.stringify(c[0], null, 2).substring(0, 500));
  }
  await client.close();
}
run().catch(console.error);
