// GenerateFromAnalysis - Application Use Case
// Consumes Project Analysis cards and generates Requirement cards with deterministic acceptance criteria.
// This is NOT AI — it is a deterministic generator based on category patterns.
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity, RequirementSource, AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';

interface CategoryCriteriaPattern {
  category: string;
  criteriaPrefixes: string[];
}

// Deterministic patterns for generating acceptance criteria based on category.
const CRITERIA_PATTERNS: CategoryCriteriaPattern[] = [
  {
    category: 'Authentication',
    criteriaPrefixes: [
      'User can login with valid credentials.',
      'Invalid password returns Unauthorized.',
      'Expired token returns Unauthorized.',
      'Refresh token returns a new access token.',
      'Locked account returns 423 Locked.',
    ],
  },
  {
    category: 'Registration',
    criteriaPrefixes: [
      'User can register with valid details.',
      'Duplicate email returns Conflict.',
      'Weak password returns Bad Request.',
      'Verification email is sent after registration.',
      'Unverified user cannot login.',
    ],
  },
  {
    category: 'Orders',
    criteriaPrefixes: [
      'User can create a new order.',
      'User can view order details.',
      'User can cancel a pending order.',
      'Order total is calculated correctly.',
      'Empty cart returns Bad Request.',
    ],
  },
  {
    category: 'Payments',
    criteriaPrefixes: [
      'Payment is processed successfully.',
      'Insufficient funds returns 402 Payment Required.',
      'Refund is processed within 5 business days.',
      'Payment receipt is emailed to user.',
      'Duplicate payment is prevented.',
    ],
  },
  {
    category: 'Products',
    criteriaPrefixes: [
      'User can search products by name.',
      'Product details are displayed correctly.',
      'Out-of-stock product cannot be purchased.',
      'Product catalog is paginated.',
      'Product filters work correctly.',
    ],
  },
  {
    category: 'Notifications',
    criteriaPrefixes: [
      'Notification is sent on successful action.',
      'User can mark notification as read.',
      'Unread notifications count is accurate.',
      'Notification preferences are respected.',
      'Notifications are delivered within 1 minute.',
    ],
  },
  {
    category: 'User Management',
    criteriaPrefixes: [
      'User profile can be updated.',
      'User can change password.',
      'User can deactivate account.',
      'Admin can manage user roles.',
      'User avatar is uploaded successfully.',
    ],
  },
  {
    category: 'Search',
    criteriaPrefixes: [
      'Search returns relevant results.',
      'Empty search returns all items.',
      'Search is case-insensitive.',
      'Search results are paginated.',
      'Special characters are handled safely.',
    ],
  },
];

export class GenerateFromAnalysis {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly analysisRepository: AnalysisRepository
  ) {}

  async execute(projectId: string, analysisId: string): Promise<RequirementEntity[]> {
    const analysis = await this.analysisRepository.findById(analysisId);
    if (!analysis) {
      throw new Error(`Analysis with id ${analysisId} not found`);
    }

    const pattern = CRITERIA_PATTERNS.find((p) => p.category.toLowerCase() === analysis.category.toLowerCase());
    const criteriaTexts = pattern?.criteriaPrefixes || [
      `${analysis.title} requirement is satisfied.`,
      `${analysis.title} validation is enforced.`,
      `${analysis.title} error is handled gracefully.`,
    ];

    const acceptanceCriteria: AcceptanceCriterion[] = criteriaTexts.map((text) => ({
      id: crypto.randomUUID(),
      text,
    }));

    const requirement = new RequirementEntity(
      crypto.randomUUID(),
      projectId,
      analysis.title,
      analysis.description,
      analysis.category,
      analysis.confidence,
      'ProjectAnalysis',
      analysisId,
      'Pending',
      'Suggested',
      analysis.relatedOperations,
      analysis.relatedFlows,
      analysis.relatedDatasets,
      acceptanceCriteria,
      Date.now(),
      Date.now()
    );

    return [await this.requirementRepository.create(requirement)];
  }
}

export default GenerateFromAnalysis;