import { describe, expect, it, beforeEach } from 'vitest';
import { ListEnvironments, GetEnvironment, CreateEnvironment, UpdateEnvironment, DeleteEnvironment } from './index';
import type { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import type { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';

describe('Environment use cases', () => {
  let repository: EnvironmentRepository;
  let useCases: {
    list: ListEnvironments;
    get: GetEnvironment;
    create: CreateEnvironment;
    update: UpdateEnvironment;
    delete: DeleteEnvironment;
  };

  beforeEach(() => {
    repository = {
      list: () => Promise.resolve([]),
      findByProject: () => Promise.resolve([]),
      findById: () => Promise.resolve(null),
      create: () => Promise.resolve({} as EnvironmentEntity),
      update: () => Promise.resolve({} as EnvironmentEntity),
      delete: () => Promise.resolve(undefined),
      existsByName: () => Promise.resolve(false),
    } as unknown as EnvironmentRepository;

    useCases = {
      list: new ListEnvironments(repository),
      get: new GetEnvironment(repository),
      create: new CreateEnvironment(repository),
      update: new UpdateEnvironment(repository),
      delete: new DeleteEnvironment(repository),
    };
  });

  describe('ListEnvironments', () => {
    it('returns all environments when no projectId provided', async () => {
      const environments = [{ id: '1', name: 'Dev' }] as EnvironmentEntity[];
      repository.list = () => Promise.resolve(environments);

      const result = await useCases.list.execute({});
      expect(result).toEqual(environments);
    });

    it('filters environments by projectId', async () => {
      const projectEnvironments = [{ id: '2', projectId: 'proj-1', name: 'Staging' }] as EnvironmentEntity[];
      repository.findByProject = () => Promise.resolve(projectEnvironments);

      const result = await useCases.list.execute({ projectId: 'proj-1' });
      expect(result).toEqual(projectEnvironments);
    });

    it('returns empty array when no environments exist', async () => {
      const result = await useCases.list.execute({});
      expect(result).toEqual([]);
    });
  });

  describe('GetEnvironment', () => {
    it('returns environment when found', async () => {
      const environment = { id: 'env-123', name: 'Production' } as EnvironmentEntity;
      repository.findById = () => Promise.resolve(environment);

      const result = await useCases.get.execute('env-123');
      expect(result).toEqual(environment);
    });

    it('throws error when environment not found', async () => {
      repository.findById = () => Promise.resolve(null);

      await expect(useCases.get.execute('nonexistent')).rejects.toThrow('Environment with id nonexistent not found');
    });
  });

  describe('CreateEnvironment', () => {
    it('creates environment with required fields', async () => {
      const created = {
        id: 'new-env',
        projectId: 'proj-1',
        name: 'Dev',
        baseUrl: 'http://localhost',
        authentication: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as EnvironmentEntity;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({ projectId: 'proj-1', name: 'Dev', baseUrl: 'http://localhost' });
      expect(result).toEqual(created);
    });

    it('creates environment with all fields', async () => {
      const created = {
        id: 'env-1',
        projectId: 'proj-1',
        name: 'Full Env',
        baseUrl: 'http://localhost',
        description: 'Description',
        authentication: null,
        variables: { key: 'value' },
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as EnvironmentEntity;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({
        projectId: 'proj-1',
        name: 'Full Env',
        baseUrl: 'http://localhost',
        description: 'Description',
        variables: { key: 'value' },
        timeout: 5000,
      });
      expect(result).toEqual(created);
    });
  });

  describe('UpdateEnvironment', () => {
    it('updates environment fields', async () => {
      const updated = { id: 'env-123', name: 'Updated Environment' } as EnvironmentEntity;
      repository.findById = () => Promise.resolve(updated);
      repository.update = () => Promise.resolve(updated);

      const result = await useCases.update.execute({ id: 'env-123', name: 'Updated Environment' });
      expect(result).toEqual(updated);
    });

    it('supports partial updates', async () => {
      const updated = { id: 'env-123', description: 'New description' } as EnvironmentEntity;
      repository.findById = () => Promise.resolve(updated);
      repository.update = () => Promise.resolve(updated);

      const result = await useCases.update.execute({ id: 'env-123', description: 'New description' });
      expect(result).toEqual(updated);
    });
  });

  describe('DeleteEnvironment', () => {
    it('deletes environment', async () => {
      let deleted = false;
      const existing = { id: 'env-123', projectId: 'proj-1' } as EnvironmentEntity;
      repository.findById = () => Promise.resolve(existing);
      repository.delete = () => {
        deleted = true;
        return Promise.resolve(undefined);
      };

      await useCases.delete.execute('env-123');
      expect(deleted).toBe(true);
    });

    it('throws error when environment not found', async () => {
      repository.findById = () => Promise.resolve(null);

      await expect(useCases.delete.execute('nonexistent')).rejects.toThrow('Environment with id nonexistent not found');
    });
  });
});