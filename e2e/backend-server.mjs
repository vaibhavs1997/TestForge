// Isolate persisted fixtures from developer data and from other test runs.
if (!process.env.TESTFORGE_E2E_DATA_ROOT) throw new Error('E2E data directory is required');
process.chdir(process.env.TESTFORGE_E2E_DATA_ROOT);
Object.assign(process.env, { MONGODB_URI: '', MONGODB_URL: '', MONGO_URI: '', TESTFORGE_API_KEY: '', DB_PATH: './data/testforge.db', PERSISTENCE_DRIVER: 'json' });
await import('../backend/dist/index.js');
