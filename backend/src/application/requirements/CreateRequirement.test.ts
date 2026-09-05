import { describe, expect, it, vi } from 'vitest';
import { CreateRequirement } from './CreateRequirement.js';

describe('CreateRequirement', () => {
  it('normalizes string acceptance criteria for strategy planning compatibility', async () => {
    const create = vi.fn(async (requirement) => requirement);
    const requirement = await new CreateRequirement({ create } as any).execute({
      projectId: 'project-1',
      title: 'Fixture requirement',
      acceptanceCriteria: [' verify fixture ', '   '],
    });

    expect(requirement.acceptanceCriteria).toHaveLength(1);
    expect(requirement.acceptanceCriteria[0]).toMatchObject({ text: 'verify fixture' });
    expect(requirement.acceptanceCriteria[0].id).toEqual(expect.any(String));
  });

  it('preserves object acceptance criteria while trimming their text', async () => {
    const create = vi.fn(async (requirement) => requirement);
    const requirement = await new CreateRequirement({ create } as any).execute({
      projectId: 'project-1',
      title: 'Object requirement',
      acceptanceCriteria: [{ id: 'criterion-1', text: ' verify object ' }],
    });

    expect(requirement.acceptanceCriteria).toEqual([{ id: 'criterion-1', text: 'verify object' }]);
  });
});
