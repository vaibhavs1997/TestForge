// Webhook domain entity

export type WebhookEvent = 
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'environment.created'
  | 'environment.updated'
  | 'environment.deleted'
  | 'api.imported'
  | 'test.executed'
  | 'pipeline.completed'
  | 'execution.finished';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: Record<string, any>;
  projectId?: string;
}

export class WebhookEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly url: string,
    public readonly events: WebhookEvent[],
    public readonly active: boolean,
    public readonly headers: Record<string, string>,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

export default WebhookEntity;