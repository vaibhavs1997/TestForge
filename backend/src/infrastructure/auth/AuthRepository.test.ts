import { it, expect, vi } from 'vitest';
const storage = vi.hoisted(() => ({ findOne: vi.fn().mockResolvedValue(null), insertOne: vi.fn().mockResolvedValue({}) }));
vi.mock('./mongoClient.js', () => ({ getMongoDb: () => ({ collection: () => storage }), getUsersCollectionName: () => 'users' }));
import { AuthRepository } from './AuthRepository.js';

it('assigns unrelated memberships to registrations with the same organization name', async () => {
  const repository = new AuthRepository();
  const input = { firstName:'Test',lastName:'User',password:'test-only-password',organizationName:'Shared Organization' };
  const first = await repository.registerUser({...input,email:'first@example.test'});
  const second = await repository.registerUser({...input,email:'second@example.test'});
  expect(first.tenantId).not.toBe(second.tenantId);
  expect(first.tenantId).toMatch(/^[0-9a-f-]{36}$/);
});
