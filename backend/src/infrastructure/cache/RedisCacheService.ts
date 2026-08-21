// Redis cache service implementation (optional - falls back to no-op if Redis not available)
import { CacheService, CACHE_TTL, CACHE_KEYS } from './CacheService.js';

// In-memory fallback for development
class MemoryCache implements CacheService {
  private cache = new Map<string, { value: any; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const record = this.cache.get(key);
    if (!record) return null;
    if (Date.now() > record.expires) {
      this.cache.delete(key);
      return null;
    }
    return record.value;
  }

  async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }
}

// Redis implementation (requires ioredis package)
class RedisCache implements CacheService {
  private redis: any;
  private connected: boolean = false;

  constructor(redisClient: any) {
    this.redis = redisClient;
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.connected = true;
    } catch {
      console.warn('Redis connection failed, falling back to memory cache');
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.connected) await this.testConnection();
      if (!this.connected) return null;
      
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      if (!this.connected) await this.testConnection();
      if (!this.connected) return;
      
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.error('Cache set error:', err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.connected) await this.testConnection();
      if (!this.connected) return;
      
      await this.redis.del(key);
    } catch (err) {
      console.error('Cache del error:', err);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (!this.connected) await this.testConnection();
      if (!this.connected) return;
      
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (err) {
      console.error('Cache delPattern error:', err);
    }
  }

  async flush(): Promise<void> {
    try {
      if (!this.connected) await this.testConnection();
      if (!this.connected) return;
      
      await this.redis.flushdb();
    } catch (err) {
      console.error('Cache flush error:', err);
    }
  }
}

// Factory function
export async function createCacheService(redisUrl?: string): Promise<CacheService> {
  if (redisUrl) {
    try {
      // Dynamic import to avoid requiring ioredis (optional dependency)
      // @ts-expect-error - ioredis is an optional dependency not declared in tsconfig
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl);
      return new RedisCache(redis);
    } catch {
      console.warn('ioredis not installed, using memory cache');
      return new MemoryCache();
    }
  }
  
  return new MemoryCache();
}

// Singleton instance
let cacheInstance: Promise<CacheService> | null = null;

export function getCacheService(redisUrl?: string): Promise<CacheService> {
  if (!cacheInstance) {
    cacheInstance = createCacheService(redisUrl);
  }
  return cacheInstance;
}
