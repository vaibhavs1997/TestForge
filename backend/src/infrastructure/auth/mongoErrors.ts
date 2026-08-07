import { MongoServerError } from 'mongodb';

export function isMongoDocumentValidationError(err: unknown): err is MongoServerError {
  return err instanceof MongoServerError && err.code === 121;
}

function summarizeValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const rules = (details as { schemaRulesNotSatisfied?: unknown[] }).schemaRulesNotSatisfied;
  if (!Array.isArray(rules)) return null;

  const hints: string[] = [];
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    const name = (rule as { operatorName?: string }).operatorName;
    if (name === 'additionalProperties') {
      const extra = (rule as { additionalProperties?: string[] }).additionalProperties;
      if (extra?.includes('_id')) {
        hints.push(
          'Add _id to the validator properties (ObjectId) when using additionalProperties: false — MongoDB always stores _id on every document.',
        );
      } else if (extra?.length) {
        hints.push(`Disallowed extra fields: ${extra.join(', ')}.`);
      }
    }
    if (name === 'required') {
      const missing = (rule as { missingProperties?: string[] }).missingProperties;
      if (missing?.length) {
        hints.push(`Missing required fields: ${missing.join(', ')}.`);
      }
    }
  }
  return hints.length ? hints.join(' ') : null;
}

export function formatMongoDocumentValidationError(err: unknown): Error {
  if (!isMongoDocumentValidationError(err)) {
    return err instanceof Error ? err : new Error('Registration failed');
  }

  const errInfo = (err as MongoServerError & { errInfo?: { details?: unknown } }).errInfo;
  const summary = summarizeValidationDetails(errInfo?.details);
  const detailText =
    errInfo?.details != null && !summary ? ` ${JSON.stringify(errInfo.details)}` : '';

  const base =
    'Account could not be saved: MongoDB collection validation rejected the user document. ' +
    'Update Atlas → userAuthentication → Validation (see backend/docs/mongo-userAuthentication-schema.js).';

  return new Error(summary ? `${base} ${summary}` : `${base}${detailText}`);
}
