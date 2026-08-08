// Redis cache service interface
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  flush(): Promise<void>;
}

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

export const CACHE_KEYS = {
  PROJECTS_LIST: 'projects:list',
  PROJECT_BY_ID: (id: string) => `project:${id}`,
  ENVIRONMENTS_BY_PROJECT: (projectId: string) => `environments:${projectId}`,
  KNOWLEDGE_BASE: 'knowledge:list',
  API_CONTRACTS: (projectId: string) => `apis:${projectId}`,
} as const;