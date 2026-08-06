import type { PersistenceDriver } from '../../config';
import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import { JsonProjectRepository } from '../project/JsonProjectRepository';
import { SqliteProjectRepository } from '../project/SqliteProjectRepository';

export function createProjectRepository(
  driver: PersistenceDriver,
  dbPath: string,
): ProjectRepository {
  if (driver === 'sqlite') {
    return new SqliteProjectRepository(dbPath);
  }
  return new JsonProjectRepository();
}

export default createProjectRepository;
