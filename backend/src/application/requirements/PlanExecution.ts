// PlanExecution - Deterministic Execution Planner
// Converts Test Designs into executable execution plans.
// Does NOT execute APIs. It prepares execution.
// Reuses Test Design, Knowledge Flows, Runtime Variables, Population Strategies, API Operations.
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository.js';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { ExecutionPlanEntity, RequestTemplate, ExecutionPlanStatus } from '../../domain/requirements/ExecutionPlanEntity.js';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';

export class PlanExecution {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async execute(requirementId: string): Promise<ExecutionPlanEntity[]> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    // Get all test designs for this requirement
  const designs = (await this.testDesignRepository.findByRequirement(requirementId)).filter(
      (d) => d.status !== 'Disabled',
    );
    if (!designs || designs.length === 0) {
      throw new Error('No test designs found for this requirement');
    }

    const existingPlans = await this.executionPlanRepository.findByRequirement(requirementId);
    for (const plan of existingPlans) {
      await this.executionPlanRepository.delete(plan.id);
    }

    // Get related knowledge flows to determine execution order
    const flows = await this.knowledgeFlowRepository.findByProject(requirement.projectId);
    const relatedFlows = flows.filter(flow => 
      requirement.relatedFlows.includes(flow.id)
    );

    // Get API operations for request templates
    const operations: Map<string, any> = new Map();
    for (const design of designs) {
      if (design.operationId) {
        const op = await this.apiOperationRepository.findById(design.operationId);
        if (op) {
          operations.set(design.operationId, op);
        }
      }
    }

    // Sort designs by priority (High first, then Medium, then Low)
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const prioritySortedDesigns = [...designs].sort((a, b) => {
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
    const sortedDesigns = this.orderByDesignDependencies(prioritySortedDesigns);

    // Generate execution plans with resolved dependencies and order
    const plans: ExecutionPlanEntity[] = [];
    const now = Date.now();

    for (let i = 0; i < sortedDesigns.length; i++) {
      const design = sortedDesigns[i];
      
      // Resolve prerequisites - designs that must execute before this one
      const prerequisiteDesignIds = this.resolvePrerequisites(design, sortedDesigns, i);

      // Build request template from API operation
      const operation = operations.get(design.operationId);
      const requestTemplate: RequestTemplate = {
        method: operation?.method || 'GET',
        path: operation?.path || '/',
        headers: design.requestOverrides?.headers,
        queryParams: design.requestOverrides?.queryParams,
        body: design.requestOverrides?.body,
      };

      // Determine execution order based on flow steps
      const executionOrder = this.resolveExecutionOrder(design, relatedFlows, i);

      const plan = new ExecutionPlanEntity(
        randomUUID(),
        requirement.projectId,
        requirementId,
        design.id,
        executionOrder,
        prerequisiteDesignIds,
        design.operationId,
        design.environmentId,
        design.datasetId,
        design.runtimeBindings,
        requestTemplate,
        design.assertions,
        design.cleanup,
        'Ready',
        now,
        now
      );

      plans.push(plan);
    }

    // Sort plans by execution order
    plans.sort((a, b) => a.executionOrder - b.executionOrder);

    // Persist plans
    const persistedPlans: ExecutionPlanEntity[] = [];
    for (const plan of plans) {
      const persisted = await this.executionPlanRepository.create(plan);
      persistedPlans.push(persisted);
    }

    return persistedPlans;
  }

  private resolvePrerequisites(design: TestDesignEntity, allDesigns: TestDesignEntity[], currentIndex: number): string[] {
    const prerequisites: string[] = [];

    const byOperation = new Map<string, TestDesignEntity>();
    for (const candidate of allDesigns) if (candidate.operationId && !byOperation.has(candidate.operationId)) byOperation.set(candidate.operationId, candidate);
    const collectDependencies = (operationId: string, seen = new Set<string>()) => {
      if (seen.has(operationId)) return;
      seen.add(operationId);
      const producer = byOperation.get(operationId);
      if (!producer || producer.id === design.id) return;
      if (!prerequisites.includes(producer.id)) prerequisites.push(producer.id);
      for (const dependency of producer.dependencies || []) collectDependencies(dependency.sourceOperationId, seen);
    };
    for (const dependency of design.dependencies || []) collectDependencies(dependency.sourceOperationId);
    
    // Designs with runtime bindings that source from 'response' need prerequisites
    for (const binding of design.runtimeBindings) {
      if (binding.source === 'response') {
        // Find designs that produce this variable
        for (let j = 0; j < currentIndex; j++) {
          const prevDesign = allDesigns[j];
          // If previous design has assertions that check for this variable
          if (prevDesign.assertions.some(a => a.path?.includes(binding.variable))) {
            if (!prerequisites.includes(prevDesign.id)) {
              prerequisites.push(prevDesign.id);
            }
          }
        }
      }
    }

    // Security and Authentication designs should come before Positive designs
    if (design.assertions.some(a => a.expected === 200)) {
      for (let j = 0; j < currentIndex; j++) {
        const prevDesign = allDesigns[j];
        if (prevDesign.assertions.some(a => a.expected === 401 || a.expected === 200) && 
            !prerequisites.includes(prevDesign.id)) {
          // Only add if it's a security/auth design
          if (prevDesign.runtimeBindings.some(b => b.variable === 'accessToken')) {
            prerequisites.push(prevDesign.id);
          }
        }
      }
    }

    return prerequisites;
  }

  private resolveExecutionOrder(design: TestDesignEntity, flows: any[], fallbackIndex: number): number {
    // If we have related flows, try to match design to flow steps
    for (const flow of flows) {
      if (flow.steps) {
        for (let i = 0; i < flow.steps.length; i++) {
          const step = flow.steps[i];
          // Match by operation ID or title
          if (step.linkedApiOperation === design.operationId ||
              step.title?.toLowerCase().includes(design.strategyItemId?.toLowerCase() || '')) {
            return i + 1;
          }
        }
      }
    }

    // Fallback to priority-based ordering
    return fallbackIndex + 1;
  }

  private orderByDesignDependencies(designs: TestDesignEntity[]): TestDesignEntity[] {
    const byOperation = new Map<string, TestDesignEntity>();
    for (const design of designs) if (design.operationId && !byOperation.has(design.operationId)) byOperation.set(design.operationId, design);
    const ordered: TestDesignEntity[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (design: TestDesignEntity) => {
      if (visited.has(design.id)) return;
      if (visiting.has(design.id)) return;
      visiting.add(design.id);
      for (const dependency of design.dependencies || []) {
        const producer = byOperation.get(dependency.sourceOperationId);
        if (producer) visit(producer);
      }
      visiting.delete(design.id);
      visited.add(design.id);
      ordered.push(design);
    };
    for (const design of designs) visit(design);
    return ordered;
  }
}

export default PlanExecution;
