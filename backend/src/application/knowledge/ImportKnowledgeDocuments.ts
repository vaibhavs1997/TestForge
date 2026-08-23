import { CreateKnowledgeFlow } from './CreateKnowledgeFlow.js';
import { ManageBusinessRules } from './ManageBusinessRules.js';
import { ManageRuntimeVariables } from './ManageRuntimeVariables.js';
import { ManageDependencies } from './ManageDependencies.js';
import { ManageDocumentation } from './ManageDocumentation.js';
import { extractDocumentText, isKnowledgePackJson } from './extractDocumentText.js';

export interface KnowledgeImportFile {
  originalname: string;
  buffer: Buffer;
}

export interface KnowledgeImportCreatedCounts {
  flows: number;
  rules: number;
  variables: number;
  dependencies: number;
  documentation: number;
}

export interface KnowledgeImportResult {
  created: KnowledgeImportCreatedCounts;
  errors: string[];
  filesProcessed: number;
}

interface KnowledgePack {
  flows?: Array<Record<string, unknown>>;
  rules?: Array<Record<string, unknown>>;
  variables?: Array<Record<string, unknown>>;
  dependencies?: Array<Record<string, unknown>>;
  documentation?: Array<Record<string, unknown>>;
}

function parseMarkdownSections(
  markdown: string,
  fileName: string
): Array<{ title: string; content: string; category: string }> {
  const normalized = markdown.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];

  const parts = normalized.split(/\n(?=#{1,3}\s+)/);
  const sections: Array<{ title: string; content: string; category: string }> = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+?)(?:\n|$)/);
    if (headingMatch) {
      const title = headingMatch[1].trim();
      const content = trimmed.replace(/^#{1,3}\s+.+?\n?/, '').trim();
      sections.push({
        title: title || fileName,
        content: content || trimmed,
        category: 'Imported',
      });
    } else if (sections.length === 0) {
      sections.push({
        title: fileName.replace(/\.[^.]+$/, ''),
        content: trimmed,
        category: 'Imported',
      });
    }
  }

  return sections;
}

function baseTitle(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || fileName;
}

export class ImportKnowledgeDocuments {
  constructor(
    private readonly createKnowledgeFlow: CreateKnowledgeFlow,
    private readonly manageBusinessRules: ManageBusinessRules,
    private readonly manageRuntimeVariables: ManageRuntimeVariables,
    private readonly manageDependencies: ManageDependencies,
    private readonly manageDocumentation: ManageDocumentation
  ) {}

  async execute(projectId: string, files: KnowledgeImportFile[]): Promise<KnowledgeImportResult> {
    const result: KnowledgeImportResult = {
      created: { flows: 0, rules: 0, variables: 0, dependencies: 0, documentation: 0 },
      errors: [],
      filesProcessed: 0,
    };

    if (!files.length) {
      result.errors.push('No files uploaded');
      return result;
    }

    for (const file of files) {
      result.filesProcessed += 1;
      const name = file.originalname || 'upload';

      try {
        const text = await extractDocumentText(name, file.buffer);

        if (isKnowledgePackJson(name, text)) {
          await this.ingestPack(projectId, name, JSON.parse(text) as KnowledgePack, result);
          continue;
        }

        const ext = name.toLowerCase();
        const useSections =
          ext.endsWith('.md') ||
          ext.endsWith('.markdown') ||
          ext.endsWith('.mdx') ||
          text.includes('\n## ') ||
          text.includes('\n### ');

        if (useSections) {
          const sections = parseMarkdownSections(text, name);
          if (sections.length === 0) {
            result.errors.push(`${name}: no content to import`);
            continue;
          }
          for (const section of sections) {
            await this.manageDocumentation.create({
              projectId,
              title: section.title,
              content: section.content,
              category: section.category,
              tags: ['imported'],
              linkedApiOperationIds: [],
              linkedRequirementIds: [],
              author: 'Import',
              version: '1.0',
            });
            result.created.documentation += 1;
          }
          continue;
        }

        if (!text) {
          result.errors.push(`${name}: empty after text extraction`);
          continue;
        }

        await this.manageDocumentation.create({
          projectId,
          title: baseTitle(name),
          content: text,
          category: 'Imported',
          tags: ['imported'],
          linkedApiOperationIds: [],
          linkedRequirementIds: [],
          author: 'Import',
          version: '1.0',
        });
        result.created.documentation += 1;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'import failed';
        result.errors.push(`${name}: ${message}`);
      }
    }

    return result;
  }

  private async ingestPack(
    projectId: string,
    fileName: string,
    pack: KnowledgePack,
    result: KnowledgeImportResult
  ): Promise<void> {
    for (const flow of pack.flows ?? []) {
      try {
        await this.createKnowledgeFlow.execute({
          projectId,
          name: String(flow.name ?? 'Imported flow'),
          description: String(flow.description ?? ''),
          tags: Array.isArray(flow.tags) ? (flow.tags as string[]) : [],
          status: (flow.status as 'Draft' | 'Confirmed' | 'Deprecated') ?? 'Draft',
          steps: Array.isArray(flow.steps) ? (flow.steps as any[]) : [],
        });
        result.created.flows += 1;
      } catch (e: unknown) {
        result.errors.push(`${fileName} flow: ${e instanceof Error ? e.message : 'create failed'}`);
      }
    }
    for (const rule of pack.rules ?? []) {
      try {
        await this.manageBusinessRules.create({
          projectId,
          name: String(rule.name ?? 'Imported rule'),
          description: String(rule.description ?? ''),
          ruleType: String(rule.ruleType ?? 'General'),
          condition: String(rule.condition ?? ''),
          expectedOutcome: String(rule.expectedOutcome ?? ''),
          severity: (rule.severity as 'High' | 'Medium' | 'Low') ?? 'Medium',
          linkedApiOperationIds: (rule.linkedApiOperationIds as string[]) ?? [],
          linkedRequirementIds: (rule.linkedRequirementIds as string[]) ?? [],
          tags: Array.isArray(rule.tags) ? (rule.tags as string[]) : [],
          isActive: rule.isActive !== false,
        });
        result.created.rules += 1;
      } catch (e: unknown) {
        result.errors.push(`${fileName} rule: ${e instanceof Error ? e.message : 'create failed'}`);
      }
    }
    for (const variable of pack.variables ?? []) {
      try {
        await this.manageRuntimeVariables.create({
          projectId,
          name: String(variable.name ?? 'imported_var'),
          description: String(variable.description ?? ''),
          scope: (variable.scope as any) ?? 'Project',
          defaultValue: String(variable.defaultValue ?? ''),
          isSensitive: Boolean(variable.isSensitive),
          linkedApiOperationIds: (variable.linkedApiOperationIds as string[]) ?? [],
          linkedRequirementIds: (variable.linkedRequirementIds as string[]) ?? [],
          tags: Array.isArray(variable.tags) ? (variable.tags as string[]) : [],
        });
        result.created.variables += 1;
      } catch (e: unknown) {
        result.errors.push(`${fileName} variable: ${e instanceof Error ? e.message : 'create failed'}`);
      }
    }
    for (const dep of pack.dependencies ?? []) {
      try {
        await this.manageDependencies.create({
          projectId,
          name: String(dep.name ?? 'Imported dependency'),
          description: String(dep.description ?? ''),
          dependencyType: (dep.dependencyType as any) ?? 'Service',
          target: String(dep.target ?? ''),
          version: String(dep.version ?? ''),
          isRequired: dep.isRequired !== false,
          linkedApiOperationIds: (dep.linkedApiOperationIds as string[]) ?? [],
          linkedRequirementIds: (dep.linkedRequirementIds as string[]) ?? [],
          tags: Array.isArray(dep.tags) ? (dep.tags as string[]) : [],
        });
        result.created.dependencies += 1;
      } catch (e: unknown) {
        result.errors.push(`${fileName} dependency: ${e instanceof Error ? e.message : 'create failed'}`);
      }
    }
    for (const doc of pack.documentation ?? []) {
      try {
        await this.manageDocumentation.create({
          projectId,
          title: String(doc.title ?? 'Imported doc'),
          content: String(doc.content ?? ''),
          category: String(doc.category ?? 'Imported'),
          tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : ['imported'],
          linkedApiOperationIds: (doc.linkedApiOperationIds as string[]) ?? [],
          linkedRequirementIds: (doc.linkedRequirementIds as string[]) ?? [],
          author: String(doc.author ?? 'Import'),
          version: String(doc.version ?? '1.0'),
        });
        result.created.documentation += 1;
      } catch (e: unknown) {
        result.errors.push(`${fileName} doc: ${e instanceof Error ? e.message : 'create failed'}`);
      }
    }
  }
}

export default ImportKnowledgeDocuments;
