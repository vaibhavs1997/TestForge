import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export interface FindByIdRepository<T> {
  findById(id: string): Promise<T | null>;
}

export interface DeletableRepository {
  delete(id: string): Promise<void>;
}

export interface ProjectScopedNameRepository {
  existsByName(name: string, projectId: string): Promise<boolean>;
}

export function createNotFoundError(entityName: string, id: string): Error {
  return new Error(`${entityName} with id ${id} not found`);
}

export async function requireById<T>(
  repository: FindByIdRepository<T>,
  id: string,
  entityName: string
): Promise<T> {
  const entity = await repository.findById(id);
  if (!entity) {
    throw createNotFoundError(entityName, id);
  }
  return entity;
}

export async function deleteById<T>(
  repository: FindByIdRepository<T> & DeletableRepository,
  id: string,
  entityName: string
): Promise<void> {
  await requireById(repository, id, entityName);
  await repository.delete(id);
}

export async function validateUniqueProjectName(
  repository: ProjectScopedNameRepository,
  name: string,
  projectId: string,
  entityName: string,
  existingName?: string
): Promise<string> {
  const normalizedName = ValidationHelpers.validateRequired(name, `${entityName} name`);

  try {
    await ValidationHelpers.validateUniqueName(repository, normalizedName, projectId, existingName);
    return normalizedName;
  } catch (error) {
    if (error instanceof Error && error.message === `Resource with name "${normalizedName}" already exists in this project`) {
      throw new Error(`${entityName} with name "${normalizedName}" already exists in this project`);
    }
    throw error;
  }
}
