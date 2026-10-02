import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ client: null as ReturnType<typeof fakeClient> | null }));
vi.mock('mongodb', () => ({
  MongoClient: class {
    connect() { return mockState.client?.connect(); }
    db() { return mockState.client?.db(); }
    close() { return mockState.client?.close(); }
  },
}));

import { connectMongo, disconnectMongo, getMongoDb, getUsersCollectionName, isMongoConnected } from './mongoClient.js';

function fakeClient(connect: () => Promise<void> = async () => undefined) {
  const collection = { createIndex: vi.fn().mockResolvedValue(undefined) };
  const database = { collection: vi.fn().mockReturnValue(collection) };
  return {
    connect: vi.fn(connect),
    db: vi.fn().mockReturnValue(database),
    close: vi.fn().mockResolvedValue(undefined),
    collection,
    database,
  };
}

describe('MongoDB connection lifecycle', () => {
  beforeEach(async () => {
    await disconnectMongo();
    mockState.client = null;
    delete process.env.MONGODB_USERS_COLLECTION;
  });

  it('shares an in-flight connection and exposes it after initialization', async () => {
    const client = fakeClient();
    mockState.client = client;

    const [first, second] = await Promise.all([
      connectMongo('mongodb://localhost/testforge'),
      connectMongo('mongodb://localhost/testforge'),
    ]);

    expect(first).toBe(second);
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(isMongoConnected()).toBe(true);
    expect(getMongoDb()).toBe(first);
  });

  it('clears failed connection state so a later startup can retry', async () => {
    const client = fakeClient(async () => { throw new Error('connection failed'); });
    mockState.client = client;

    await expect(connectMongo('mongodb://localhost/testforge')).rejects.toThrow('connection failed');
    expect(isMongoConnected()).toBe(false);
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(() => getMongoDb()).toThrow('MongoDB is not connected');

    const retryClient = fakeClient();
    mockState.client = retryClient;
    await connectMongo('mongodb://localhost/testforge');
    expect(isMongoConnected()).toBe(true);
  });

  it('reads the configured collection after environment loading', () => {
    process.env.MONGODB_USERS_COLLECTION = 'users_from_env';
    expect(getUsersCollectionName()).toBe('users_from_env');
  });
});
