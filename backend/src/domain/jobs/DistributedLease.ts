export interface DistributedLease { key: string; ownerId: string; expiresAt: number; }
export interface DistributedLeaseRepository { acquire(key: string, ownerId: string, leaseMs: number): Promise<boolean>; renew(key: string, ownerId: string, leaseMs: number): Promise<boolean>; release(key: string, ownerId: string): Promise<void>; }
