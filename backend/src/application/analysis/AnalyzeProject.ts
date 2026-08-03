// AnalyzeProject - Deterministic Project Analyzer
// Reuses imported API operations, Knowledge Flows, and Dataset names to generate
// simple analysis cards. This is NOT AI — it is a deterministic keyword-based analyzer.
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';

interface AnalysisPattern {
  category: string;
  title: string;
  description: string;
  keywords: string[];
}

// Deterministic patterns — each card is generated when matching operations/flows/datasets are found.
const ANALYSIS_PATTERNS: AnalysisPattern[] = [
  {
    category: 'Authentication',
    title: 'Authentication',
    description: 'Authentication detected because login, logout, and token refresh operations were found.',
    keywords: ['login', 'logout', 'auth', 'token', 'refresh', 'session', 'password', 'otp', 'register'],
  },
  {
    category: 'Registration',
    title: 'Registration',
    description: 'Registration detected because sign-up and user creation operations were found.',
    keywords: ['register', 'signup', 'sign-up', 'sign_up', 'create-user', 'create-user', 'account', 'verify-email', 'verification'],
  },
  {
    category: 'Orders',
    title: 'Orders',
    description: 'Order management detected because order creation, listing, and update operations were found.',
    keywords: ['order', 'cart', 'checkout', 'invoice', 'payment', 'purchase'],
  },
  {
    category: 'Payments',
    title: 'Payments',
    description: 'Payment processing detected because payment, billing, and transaction operations were found.',
    keywords: ['payment', 'pay', 'billing', 'transaction', 'charge', 'refund', 'stripe', 'paypal'],
  },
  {
    category: 'Products',
    title: 'Products',
    description: 'Product catalog detected because product listing, search, and detail operations were found.',
    keywords: ['product', 'catalog', 'inventory', 'item', 'sku', 'category', 'search'],
  },
  {
    category: 'Notifications',
    title: 'Notifications',
    description: 'Notification system detected because email, SMS, and push notification operations were found.',
    keywords: ['notification', 'notify', 'email', 'sms', 'push', 'alert', 'message'],
  },
  {
    category: 'Users',
    title: 'User Management',
    description: 'User management detected because user profile, update, and listing operations were found.',
    keywords: ['user', 'profile', 'account', 'settings', 'preference'],
  },
  {
    category: 'Search',
    title: 'Search',
    description: 'Search functionality detected because search and query operations were found.',
    keywords: ['search', 'query', 'filter', 'find', 'lookup'],
  },
];

export class AnalyzeProject {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository
  ) {}

  async execute(projectId: string): Promise<AnalysisEntity[]> {
    // 1. Gather all imported API operations for the project
    const services = await this.apiServiceRepository.findByProject(projectId);
    const operations: any[] = [];
    for (const service of services) {
      const ops = await this.apiOperationRepository.findByService(service.id);
      operations.push(...ops);
    }

    // 2. Gather all Knowledge Flows for the project
    const flows = await this.knowledgeFlowRepository.findByProject(projectId);

    // 3. Gather all Datasets for the project
    const datasets = await this.datasetRepository.findByProject(projectId);

    // 4. Build a searchable text corpus from operations, flows, and datasets
    const operationTexts = operations.map((op) => {
      const name = (op.name || op.apiName || '').toLowerCase();
      const path = (op.path || '').toLowerCase();
      const desc = (op.description || '').toLowerCase();
      return `${name} ${path} ${desc}`;
    });

    const flowTexts = flows.map((flow) => {
      const name = (flow.name || '').toLowerCase();
      const desc = (flow.description || '').toLowerCase();
      const stepTitles = (flow.steps || []).map((s: any) => (s.title || '').toLowerCase()).join(' ');
      return `${name} ${desc} ${stepTitles}`;
    });

    const datasetTexts = datasets.map((ds) => {
      const name = (ds.name || '').toLowerCase();
      const category = (ds.category || '').toLowerCase();
      return `${name} ${category}`;
    });

    const allText = [...operationTexts, ...flowTexts, ...datasetTexts].join(' ');

    // 5. Match patterns and generate analysis cards
    const generatedCards: AnalysisEntity[] = [];

    for (const pattern of ANALYSIS_PATTERNS) {
      const matchedKeywords: string[] = [];
      for (const keyword of pattern.keywords) {
        if (allText.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }

      if (matchedKeywords.length === 0) continue;

      // Confidence is deterministic: based on how many keywords matched (capped at 95)
      const confidence = Math.min(95, Math.round((matchedKeywords.length / pattern.keywords.length) * 100));

      // Related operations: operations whose name/path/description contain matched keywords
      const relatedOperations = operations
        .filter((op) => {
          const text = `${(op.name || op.apiName || '').toLowerCase()} ${(op.path || '').toLowerCase()} ${(op.description || '').toLowerCase()}`;
          return matchedKeywords.some((kw) => text.includes(kw));
        })
        .map((op) => op.id);

      // Related flows: flows whose name/description/steps contain matched keywords
      const relatedFlows = flows
        .filter((flow) => {
          const text = `${(flow.name || '').toLowerCase()} ${(flow.description || '').toLowerCase()} ${(flow.steps || []).map((s: any) => (s.title || '').toLowerCase()).join(' ')}`;
          return matchedKeywords.some((kw) => text.includes(kw));
        })
        .map((flow) => flow.id);

      // Related datasets: datasets whose name/category contain matched keywords
      const relatedDatasets = datasets
        .filter((ds) => {
          const text = `${(ds.name || '').toLowerCase()} ${(ds.category || '').toLowerCase()}`;
          return matchedKeywords.some((kw) => text.includes(kw));
        })
        .map((ds) => ds.id);

      // Related runtime variables: extract from flow step notes (deterministic)
      const relatedRuntimeVariables: string[] = [];
      for (const flow of flows) {
        for (const step of (flow.steps || [])) {
          const notes = (step.notes || '').toLowerCase();
          if (matchedKeywords.some((kw) => notes.includes(kw))) {
            // Extract variable-like tokens from notes (camelCase words)
            const tokens = (step.notes || '').match(/[a-z][a-zA-Z0-9]*/g) || [];
            for (const token of tokens) {
              if (token.length > 3 && !relatedRuntimeVariables.includes(token)) {
                relatedRuntimeVariables.push(token);
              }
            }
          }
        }
      }

      const now = Date.now();
      const card = new AnalysisEntity(
        crypto.randomUUID(),
        projectId,
        pattern.title,
        pattern.description,
        pattern.category,
        confidence,
        relatedOperations,
        relatedFlows,
        relatedDatasets,
        relatedRuntimeVariables.slice(0, 10),
        'Pending',
        now,
        now
      );

      generatedCards.push(card);
    }

    // 6. Clear existing analysis for this project and persist new cards
    const existing = await this.analysisRepository.findByProject(projectId);
    for (const item of existing) {
      await this.analysisRepository.delete(item.id);
    }

    for (const card of generatedCards) {
      await this.analysisRepository.create(card);
    }

    return generatedCards;
  }
}

export default AnalyzeProject;