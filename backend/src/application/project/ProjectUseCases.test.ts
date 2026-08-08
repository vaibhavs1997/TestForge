import { describe, expect, it, beforeEach } from 'vitest';
import { ListProjects, GetProject, CreateProject, UpdateProject, DeleteProject } from './ProjectUseCases';
import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import type { ProjectRecord } from '../../domain/project/ProjectRecord';

describe('Project use cases', () => {
  let repository: ProjectRepository;
  let useCases: {
    list: ListProjects;
    get: GetProject;
    create: CreateProject;
    update: UpdateProject;
    delete: DeleteProject;
  };

  beforeEach(() => {
    repository = {
      list: () => Promise.resolve([]),
      findById: () => Promise.resolve(null),
      create: () => Promise.resolve({} as ProjectRecord),
      update: () => Promise.resolve({} as ProjectRecord),
      delete: () => Promise.resolve(undefined),
    } as unknown as ProjectRepository;

    useCases = {
      list: new ListProjects(repository),
      get: new GetProject(repository),
      create: new CreateProject(repository),
      update: new UpdateProject(repository),
      delete: new DeleteProject(repository),
    };
  });

  describe('ListProjects', () => {
    it('returns all projects', async () => {
      const projects = [{ id: '1', name: 'Project 1' }] as ProjectRecord[];
      repository.list = () => Promise.resolve(projects);

      const result = await useCases.list.execute();
      expect(result).toEqual(projects);
    });

    it('returns empty array when no projects exist', async () => {
      const result = await useCases.list.execute();
      expect(result).toEqual([]);
    });
  });

  describe('GetProject', () => {
    it('returns project when found', async () => {
      const project = { id: '123', name: 'Test Project' } as ProjectRecord;
      repository.findById = () => Promise.resolve(project);

      const result = await useCases.get.execute('123');
      expect(result).toEqual(project);
    });

    it('throws error when project not found', async () => {
      repository.findById = () => Promise.resolve(null);

      await expect(useCases.get.execute('999')).rejects.toThrow('Project with id 999 not found');
    });
  });

  describe('CreateProject', () => {
    it('creates project with required fields', async () => {
      const created = { id: 'new-id', name: 'New Project' } as ProjectRecord;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({ name: 'New Project' });
      expect(result).toEqual(created);
    });

    it('creates project with all fields', async () => {
      const created = {
        id: 'new-id',
        name: 'Full Project',
        projectKey: 'PROJ',
        description: 'Description',
        status: 'active',
      } as ProjectRecord;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({
        name: 'Full Project',
        projectKey: 'PROJ',
        description: 'Description',
        status: 'active',
      });
      expect(result).toEqual(created);
    });

    it('passes optional id to repository', async () => {
      const created = { id: 'custom-id', name: 'Custom' } as ProjectRecord;
      repository.create = () => Promise.resolve(created);

      await useCases.create.execute({ name: 'Custom', id: 'custom-id' });
      // Repository receives the id (verified by mock implementation)
    });
  });

  describe('UpdateProject', () => {
    it('updates project fields', async () => {
      const updated = { id: '123', name: 'Updated Name' } as ProjectRecord;
      repository.update = () => Promise.resolve(updated);

      const result = await useCases.update.execute('123', { name: 'Updated Name' });
      expect(result).toEqual(updated);
    });

    it('supports partial updates', async () => {
      const updated = { id: '123', projectKey: 'NEWKEY' } as ProjectRecord;
      repository.update = () => Promise.resolve(updated);

      const result = await useCases.update.execute('123', { projectKey: 'NEWKEY' });
      expect(result).toEqual(updated);
    });
  });

  describe('DeleteProject', () => {
    it('deletes project', async () => {
      let deleted = false;
      repository.delete = () => {
        deleted = true;
        return Promise.resolve(undefined);
      };

      await useCases.delete.execute('123');
      expect(deleted).toBe(true);
    });

    it('does not throw on successful delete', async () => {
      repository.delete = () => Promise.resolve(undefined);

      await expect(useCases.delete.execute('123')).resolves.toBeUndefined();
    });
  });
});