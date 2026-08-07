import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

const USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION?.trim() || 'userAuthentication';

export async function connectMongo(uri: string): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20_000,
    autoSelectFamily: false,
  });
  await client.connect();
  db = client.db();
  await db.collection(USERS_COLLECTION).createIndex({ id: 1 }, { unique: true });
  return db;
}

export function getUsersCollectionName(): string {
  return USERS_COLLECTION;
}

export function getMongoDb(): Db {
  if (!db) {
    throw new Error(
      'MongoDB is not connected. In MongoDB Atlas: Network Access → Add IP Address (your current IP or 0.0.0.0/0 for dev). ' +
        'Also verify MONGODB_URI password is URL-encoded (@ → %40) and restart the backend.',
    );
  }
  return db;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
