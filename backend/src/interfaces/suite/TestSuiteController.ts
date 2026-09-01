// TestSuiteController - Controller for Test Suite Management endpoints
import { Request, Response } from 'express';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites.js';
import { GenerateTestSuiteWithAI } from '../../application/suite/GenerateTestSuiteWithAI.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
import { ExecuteSuite } from '../../application/suite/ExecuteSuite.js';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository.js';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository.js';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository.js';
import { ExecutePlan } from '../../application/execution/ExecutePlan.js';
import { ExecutionSafetyService } from '../../application/execution/ExecutionSafetyService.js';
import type { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import type { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
export class TestSuiteController {
    constructor(
        private readonly manageTestSuites: ManageTestSuites,
        private readonly generateTestSuiteWithAI: GenerateTestSuiteWithAI,
        private readonly executeSuite: ExecuteSuite,
        private readonly executionPlanRepository: ExecutionPlanRepository,
        private readonly executionProfileRepository: ExecutionProfileRepository,
        private readonly requirementRepository: RequirementRepository,
        private readonly executePlan: ExecutePlan,
        private readonly environmentRepository?: EnvironmentRepository,
        private readonly testDesignRepository?: TestDesignRepository,
        private readonly executionSafetyService = new ExecutionSafetyService(),
    ) { }

    private async safetyWarning(projectId: string, plans: any[], requirementId?: string): Promise<string | null> {
        if (!this.environmentRepository || !this.testDesignRepository || plans.length === 0) return null;

        const environments = await this.environmentRepository.findByProject(projectId);
        const sharedDefault = environments.find((environment) => environment.isDefault);
        const planEnvironmentId = plans.find((plan) => plan.environmentId)?.environmentId;
        const environment = sharedDefault
            || environments.find((candidate) => candidate.id === planEnvironmentId)
            || environments[0];
        if (!environment) return null;

        const candidates = await Promise.all(plans.map(async (plan) => {
            const design = plan.testDesignId ? await this.testDesignRepository!.findById(plan.testDesignId) : null;
            const candidateRequirementId = plan.requirementId || requirementId;
            const requirement = candidateRequirementId
                ? await this.requirementRepository.findById(candidateRequirementId)
                : null;
            return {
                plan,
                design,
                requirementApprovalStatus: requirement?.approvalStatus,
            };
        }));

        const warnings = this.executionSafetyService.getWarnings(environment, candidates);
        return warnings.length > 0 ? warnings.join(' ') : null;
    }

    async execute(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { failureMode, executionProfileId } = req.body || {};
        const runs = await this.executeSuite.execute(suiteId, failureMode, executionProfileId);
        res.status(201).json(createSuccessResponse(runs));
    }
    async listSuites(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const items = await this.manageTestSuites.list(projectId);
        res.status(200).json(createSuccessResponse(items));
    }
    async listRunnableSuites(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const suites = await this.manageTestSuites.list(projectId);
        const defaultProfile = await this.executionProfileRepository.findDefault(projectId);
        const result = await Promise.all(suites.map(async (suite) => {
            const orderedPlans = [...suite.executionPlans].sort((a, b) => a.order - b.order);
            const plans = await Promise.all(orderedPlans.map((item) => this.executionPlanRepository.findById(item.executionPlanId)));
            const readinessBlocker = suite.status !== 'Active'
                ? 'Suite must be approved before it can run.'
                : orderedPlans.length === 0
                    ? 'Suite has no test cases.'
                    : plans.some((plan) => !plan || plan.status !== 'Ready')
                        ? 'Suite contains a test case that is not ready.'
                        : null;
            const warning = readinessBlocker ? null : await this.safetyWarning(projectId, plans.filter(Boolean), undefined);
            return {
                id: suite.id,
                suiteType: 'suite' as const,
                name: suite.name,
                description: suite.description,
                tags: suite.tags,
                testCount: orderedPlans.length,
                executionPolicy: suite.executionPolicy,
                defaultEnvironmentId: suite.defaultEnvironmentId,
                version: suite.version || 1,
                approvedAt: suite.approvedAt,
                defaultProfileId: defaultProfile?.id || null,
                isRunnable: readinessBlocker === null,
                blocker: readinessBlocker,
                warning,
            };
        }));
        const approvedRequirements = (await this.requirementRepository.findByProject(projectId))
            .filter((requirement) => requirement.approvalStatus === 'Approved');
        const requirementSuites = await Promise.all(approvedRequirements.map(async (requirement) => {
            const plans = (await this.executionPlanRepository.findByRequirement(requirement.id))
                .filter((plan) => plan.status !== 'Disabled')
                .sort((a, b) => a.executionOrder - b.executionOrder);
            const readinessBlocker = plans.length === 0
                ? 'Approved suite has no execution steps.'
                : plans.some((plan) => plan.status !== 'Ready')
                    ? 'Approved suite contains a test case that is not ready.'
                    : null;
            const warning = readinessBlocker ? null : await this.safetyWarning(projectId, plans, requirement.id);
            return {
                id: `requirement:${requirement.id}`,
                requirementId: requirement.id,
                suiteType: 'requirement' as const,
                name: requirement.title,
                description: requirement.description,
                tags: [],
                testCount: plans.length,
                executionPolicy: 'Sequential' as const,
                defaultEnvironmentId: '',
                version: 1,
                approvedAt: requirement.updatedAt,
                defaultProfileId: defaultProfile?.id || null,
                isRunnable: readinessBlocker === null,
                blocker: readinessBlocker,
                warning,
            };
        }));
        res.status(200).json(createSuccessResponse([...result, ...requirementSuites]));
    }

    async executeApprovedSuite(req: Request, res: Response): Promise<void> {
        const { projectId, suiteId } = req.params;
        const { failureMode, executionProfileId } = req.body || {};
        if (!suiteId.startsWith('requirement:')) {
            const run = await this.executeSuite.execute(suiteId, failureMode, executionProfileId);
            res.status(201).json(createSuccessResponse(run));
            return;
        }
        const requirementId = suiteId.slice('requirement:'.length);
        const requirement = await this.requirementRepository.findById(requirementId);
        if (!requirement || requirement.projectId !== projectId || requirement.approvalStatus !== 'Approved') {
            throw new Error('Approved suite not found');
        }
        const plans = (await this.executionPlanRepository.findByRequirement(requirementId))
            .filter((plan) => plan.status !== 'Disabled')
            .sort((a, b) => a.executionOrder - b.executionOrder);
        if (plans.length === 0 || plans.some((plan) => plan.status !== 'Ready')) {
            throw new Error('All approved suite test cases must be ready before execution');
        }
        const snapshot = JSON.parse(JSON.stringify({
            suite: { id: suiteId, name: requirement.title, version: 1, approvedAt: requirement.updatedAt, executionPolicy: 'Sequential' },
            plans,
        }));
        const defaultProfile = await this.executionProfileRepository.findDefault(projectId);
        const run = await this.executePlan.executeCombined(
            plans.map((plan) => plan.id), failureMode || 'StopOnFailure', executionProfileId || defaultProfile?.id, suiteId, snapshot,
        );
        res.status(201).json(createSuccessResponse(run));
    }
    async createSuite(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;
        const suite = await this.manageTestSuites.create({
            projectId,
            name,
            description,
            tags,
            executionPlans,
            defaultEnvironmentId,
            executionPolicy,
            estimatedDuration,
            status,
        });
        res.status(201).json(createSuccessResponse(suite));
    }
    async getSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const suite = await this.manageTestSuites.get(suiteId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async updateSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;
        const suite = await this.manageTestSuites.update({
            id: suiteId,
            name,
            description,
            tags,
            executionPlans,
            defaultEnvironmentId,
            executionPolicy,
            estimatedDuration,
            status,
        });
        res.status(200).json(createSuccessResponse(suite));
    }
    async deleteSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        await this.manageTestSuites.delete(suiteId);
        res.status(204).send();
    }
    async addExecutionPlan(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { executionPlanId } = req.body;
        const suite = await this.manageTestSuites.addExecutionPlan(suiteId, executionPlanId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async removeExecutionPlan(req: Request, res: Response): Promise<void> {
        const { suiteId, executionPlanId } = req.params;
        const suite = await this.manageTestSuites.removeExecutionPlan(suiteId, executionPlanId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async generateWithAI(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateTestSuiteWithAI.execute({
            projectId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async reorderExecutionPlans(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { orderedPlanIds } = req.body;
        const suite = await this.manageTestSuites.reorderExecutionPlans(suiteId, orderedPlanIds);
        res.status(200).json(createSuccessResponse(suite));
    }
}
export default TestSuiteController;

