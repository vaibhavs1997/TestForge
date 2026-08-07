import { randomUUID } from 'node:crypto';
import { JiraClient } from '../../infrastructure/jira/JiraClient';
import { CreateRequirement } from './CreateRequirement';
import type { AcceptanceCriterion, RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { parseAcceptanceCriteriaFromText } from './jiraAcceptanceCriteria';

export class ImportRequirementFromJira {
  constructor(
    private readonly createRequirement: CreateRequirement,
    private readonly jiraClient?: JiraClient,
  ) {}

  async execute(params: { projectId: string; issueKey: string }): Promise<RequirementEntity> {
    const client = this.jiraClient ?? new JiraClient();
    const issueKey = params.issueKey.trim().toUpperCase();
    const issue = await client.getIssue(issueKey);

    const acceptanceCriteria = parseAcceptanceCriteriaFromText(issue.descriptionPlain);
    const description =
      issue.descriptionPlain ||
      (acceptanceCriteria.length > 0 ? acceptanceCriteria.map((c) => c.text).join('\n') : '');

    return this.createRequirement.execute({
      projectId: params.projectId,
      title: `${issueKey}: ${issue.summary}`,
      description,
      category: 'Jira',
      confidence: 90,
      source: 'Jira',
      reviewStatus: 'Pending',
      approvalStatus: 'Suggested',
      acceptanceCriteria:
        acceptanceCriteria.length > 0
          ? acceptanceCriteria
          : [{ id: randomUUID(), text: issue.summary }],
      jiraIssueKey: issueKey,
    });
  }
}

export default ImportRequirementFromJira;
