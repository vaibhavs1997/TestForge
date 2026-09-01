import { describe, expect, it } from 'vitest';
import { VersionEntity } from '../../domain/versioning/index.js';
import { InMemoryVersionRepository } from './VersionRepository.js';

describe('InMemoryVersionRepository', () => {
  it('deletes only the selected version and its entity index entry', async () => {
    const repository = new InMemoryVersionRepository();
    const first = new VersionEntity('version-1', 'project-a', 'Requirement', 'requirement-1', 1, { title: 'First' }, null, 'System', 100);
    const second = new VersionEntity('version-2', 'project-a', 'Requirement', 'requirement-1', 2, { title: 'Second' }, null, 'System', 200);

    await repository.create(first);
    await repository.create(second);

    expect(await repository.delete(first.id)).toBe(true);
    expect(await repository.findById(first.id)).toBeNull();
    expect((await repository.findByEntity('Requirement', 'requirement-1')).map((version) => version.id)).toEqual(['version-2']);
    expect(await repository.delete('missing-version')).toBe(false);
  });
});
