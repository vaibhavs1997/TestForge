// ManageTestSuites - Application Use Case for Test Suite Management
// A Test Suite is a reusable collection of Execution Plans.
// It does NOT execute tests itself. It prepares reusable execution collections.
import { randomUUID } from 'node:crypto';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { TestSuiteEntity, SuiteExecutionPolicy, SuiteStatus, SuiteTag, TestSuiteItem } from '../../domain/suite/TestSuiteEntity';

export interface CreateSuiteInput {
  projectId: string;
  name: string;
  description: string;
  tags: SuiteTag[];
  executionPlans: TestSuiteItem[];
  defaultEnvironmentId: string;
  executionPolicy: SuiteExecutionPolicy;
  estimatedDuration: number;
  status: SuiteStatus;
}

export interface UpdateSuiteInput {
  id: string;
  name?: string;
  description?: string;
  tags?: SuiteTag[];
  executionPlans?: TestSuiteItem[];
  defaultEnvironmentId?: string;
  executionPolicy?: SuiteExecutionPolicy;
  estimatedDuration?: number;
  status?: SuiteStatus;
}

export class ManageTestSuites {
  constructor(private readonly suiteRepository: TestSuiteRepository) {}

  async create(input: CreateSuiteInput): Promise<TestSuiteEntity> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Suite name is required');
    }
    if (!input.projectId) {
      throw new Error('Project ID is required');
    }

    const now = Date.now();
    const suite = new TestSuiteEntity(
      randomUUID(),
      input.projectId,
      input.name.trim(),
      input.description || '',
      input.tags || [],
      input.executionPlans || [],
      input.defaultEnvironmentId || '',
      input.executionPolicy || 'Sequential',
      input.estimatedDuration || 0,
      input.status || 'Draft',
      now,
      now
    );

    return this.suiteRepository.create(suite);
  }

  async update(input: UpdateSuiteInput): Promise<TestSuiteEntity> {
    const existing = await this.suiteRepository.findById(input.id);
    if (!existing) {
      throw new Error(`Test Suite with id ${input.id} not found`);
    }

    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Suite name cannot be empty');
    }

    return this.suiteRepository.update(input.id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.executionPlans !== undefined ? { executionPlans: input.executionPlans } : {}),
      ...(input.defaultEnvironmentId !== undefined ? { defaultEnvironmentId: input.defaultEnvironmentId } : {}),
      ...(input.executionPolicy !== undefined ? { executionPolicy: input.executionPolicy } : {}),
      ...(input.estimatedDuration !== undefined ? { estimatedDuration: input.estimatedDuration } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.suiteRepository.findById(id);
    if (!existing) {
      throw new Error(`Test Suite with id ${id} not found`);
    }
    await this.suiteRepository.delete(id);
  }

  async get(id: string): Promise<TestSuiteEntity> {
    const suite = await this.suiteRepository.findById(id);
    if (!suite) {
      throw new Error(`Test Suite with id ${id} not found`);
    }
    return suite;
  }

  async list(projectId: string): Promise<TestSuiteEntity[]> {
    return this.suiteRepository.findByProject(projectId);
  }

  async addExecutionPlan(suiteId: string, executionPlanId: string): Promise<TestSuiteEntity> {
    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${suiteId} not found`);
    }

    const existing = suite.executionPlans.find(item => item.executionPlanId === executionPlanId);
    if (existing) {
      return suite;
    }

    const nextOrder = suite.executionPlans.length > 0
      ? Math.max(...suite.executionPlans.map(item => item.order)) + 1
      : 1;

    const updatedPlans = [...suite.executionPlans, { executionPlanId, order: nextOrder }];
    return this.suiteRepository.update(suiteId, { executionPlans: updatedPlans });
  }

  async removeExecutionPlan(suiteId: string, executionPlanId: string): Promise<TestSuiteEntity> {
    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${suiteId} not found`);
    }

    const updatedPlans = suite.executionPlans.filter(item => item.executionPlanId !== executionPlanId);
    return this.suiteRepository.update(suiteId, { executionPlans: updatedPlans });
  }

  async reorderExecutionPlans(suiteId: string, orderedPlanIds: string[]): Promise<TestSuiteEntity> {
    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${suiteId} not found`);
    }

    const updatedPlans: TestSuiteItem[] = orderedPlanIds.map((planId, index) => ({
      executionPlanId: planId,
      order: index + 1,
    }));

    return this.suiteRepository.update(suiteId, { executionPlans: updatedPlans });
  }
}

export default ManageTestSuites;