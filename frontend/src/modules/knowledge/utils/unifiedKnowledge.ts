import type { KnowledgeSection } from '../types';

export type KnowledgeTypeFilter = 'all' | KnowledgeSection;

export interface UnifiedKnowledgeItem {
  id: string;
  type: KnowledgeSection;
  typeLabel: string;
  title: string;
  description: string;
  updatedAt: number;
  raw: unknown;
}

const TYPE_LABELS: Record<KnowledgeSection, string> = {
  flows: 'Business Flow',
  rules: 'Business Rule',
  dependencies: 'Dependency',
  variables: 'Runtime Variable',
  documentation: 'Documentation',
};

export function toUnifiedItems(input: {
  flows: any[];
  rules: any[];
  variables: any[];
  dependencies: any[];
  docs: any[];
}): UnifiedKnowledgeItem[] {
  const items: UnifiedKnowledgeItem[] = [];

  for (const flow of input.flows) {
    items.push({
      id: flow.id,
      type: 'flows',
      typeLabel: TYPE_LABELS.flows,
      title: flow.name,
      description: flow.description || '',
      updatedAt: flow.updatedAt ?? flow.createdAt ?? 0,
      raw: flow,
    });
  }
  for (const rule of input.rules) {
    items.push({
      id: rule.id,
      type: 'rules',
      typeLabel: TYPE_LABELS.rules,
      title: rule.name,
      description: rule.description || '',
      updatedAt: rule.updatedAt ?? rule.createdAt ?? 0,
      raw: rule,
    });
  }
  for (const variable of input.variables) {
    items.push({
      id: variable.id,
      type: 'variables',
      typeLabel: TYPE_LABELS.variables,
      title: variable.name,
      description: variable.description || '',
      updatedAt: variable.updatedAt ?? variable.createdAt ?? 0,
      raw: variable,
    });
  }
  for (const dep of input.dependencies) {
    items.push({
      id: dep.id,
      type: 'dependencies',
      typeLabel: TYPE_LABELS.dependencies,
      title: dep.name,
      description: dep.description || '',
      updatedAt: dep.updatedAt ?? dep.createdAt ?? 0,
      raw: dep,
    });
  }
  for (const doc of input.docs) {
    items.push({
      id: doc.id,
      type: 'documentation',
      typeLabel: TYPE_LABELS.documentation,
      title: doc.title,
      description: doc.content?.slice(0, 200) || doc.description || '',
      updatedAt: doc.updatedAt ?? doc.createdAt ?? 0,
      raw: doc,
    });
  }

  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}
