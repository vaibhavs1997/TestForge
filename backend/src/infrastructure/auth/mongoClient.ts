import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

function configuredUsersCollection(): string {
  return process.env.MONGODB_USERS_COLLECTION?.trim() || 'userAuthentication';
}

export async function connectMongo(uri: string): Promise<Db> {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  const nextClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20_000,
    autoSelectFamily: false,
  });
  client = nextClient;
  connectionPromise = (async () => {
    try {
      await nextClient.connect();
      const nextDb = nextClient.db();
      await nextDb.collection(configuredUsersCollection()).createIndex({ id: 1 }, { unique: true });
      db = nextDb;
      return nextDb;
    } catch (error) {
      await nextClient.close().catch(() => undefined);
      client = null;
      db = null;
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export function getUsersCollectionName(): string {
  return configuredUsersCollection();
}

export function isMongoConnected(): boolean {
  return db !== null;
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
  if (connectionPromise) {
    await connectionPromise.catch(() => undefined);
  }
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
