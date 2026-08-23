import type { PersistenceDriver } from '../../config.js';
import type { ProjectRepository } from '../../domain/project/ProjectRepository.js';
import { JsonProjectRepository } from '../project/JsonProjectRepository.js';
import { SqliteProjectRepository } from '../project/SqliteProjectRepository.js';

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
