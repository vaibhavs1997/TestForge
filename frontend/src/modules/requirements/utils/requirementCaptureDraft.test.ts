import { afterEach, describe, expect, it } from 'vitest';
import { clearRequirementCaptureDraft, readRequirementCaptureDraft, writeRequirementCaptureDraft } from './requirementCaptureDraft';

describe('requirement capture draft', () => {
  const projectId = 'project-capture-draft-test';

  afterEach(() => clearRequirementCaptureDraft(projectId));

  it('restores unfinished acceptance criteria for the same project', () => {
    writeRequirementCaptureDraft(projectId, {
      title: 'Password reset',
      criteriaText: 'Given a registered user\nWhen they request reset\nThen an email is sent',
      sourceMode: 'manual',
    });

    expect(readRequirementCaptureDraft(projectId)).toEqual({
      title: 'Password reset',
      criteriaText: 'Given a registered user\nWhen they request reset\nThen an email is sent',
      sourceMode: 'manual',
    });
  });

  it('clears the draft when both editable fields are empty', () => {
    writeRequirementCaptureDraft(projectId, { title: 'Temporary', criteriaText: 'A criterion', sourceMode: 'manual' });
    writeRequirementCaptureDraft(projectId, { title: '', criteriaText: '', sourceMode: 'manual' });

    expect(readRequirementCaptureDraft(projectId)).toBeNull();
  });
});
