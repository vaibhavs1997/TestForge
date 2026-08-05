// ValidateRequirementReadiness - Deterministic validator for Requirement readiness
// Reuses Requirements, Project Analysis, Knowledge, Datasets, Environment, and APIs.
// Returns a validation report indicating whether enough project information exists
// to generate executable test cases.
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity, RequirementWithRuntimeVariables } from '../../domain/requirements/RequirementEntity';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';

export type ValidationStatus = 'READY' | 'MISSING' | 'WARNING' | 'INCOMPLETE';

export interface ValidationCategory {
  name: string;
  status: ValidationStatus;
  details: string[];
}

export interface ValidationReport {
  requirementId: string;
  requirementTitle: string;
  categories: ValidationCategory[];
  overallStatus: ValidationStatus;
}

export class ValidateRequirementReadiness {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async execute(requirementId: string): Promise<ValidationReport> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    const categories: ValidationCategory[] = [];
    let overallStatus: ValidationStatus = 'READY';

    // 1. Validate APIs
    const apiStatus = await this.validateAPIs(requirement);
    categories.push(apiStatus);
    if (apiStatus.status !== 'READY') overallStatus = 'INCOMPLETE';

    // 2. Validate Business Flows
    const flowStatus = await this.validateBusinessFlows(requirement);
    categories.push(flowStatus);
    if (flowStatus.status !== 'READY') overallStatus = 'INCOMPLETE';

    // 3. Validate Datasets
    const datasetStatus = await this.validateDatasets(requirement);
    categories.push(datasetStatus);
    if (datasetStatus.status === 'MISSING') overallStatus = 'INCOMPLETE';
    else if (datasetStatus.status === 'WARNING' && overallStatus === 'READY') overallStatus = 'WARNING';

    // 4. Validate Runtime Variables
    const runtimeStatus = this.validateRuntimeVariables(requirement);
    categories.push(runtimeStatus);
    if (runtimeStatus.status === 'MISSING') overallStatus = 'INCOMPLETE';
    else if (runtimeStatus.status === 'WARNING' && overallStatus === 'READY') overallStatus = 'WARNING';

    // 5. Validate Environment
    const environmentStatus = await this.validateEnvironment(requirement.projectId);
    categories.push(environmentStatus);
    if (environmentStatus.status === 'MISSING') overallStatus = 'INCOMPLETE';
    else if (environmentStatus.status === 'WARNING' && overallStatus === 'READY') overallStatus = 'WARNING';

    // 6. Validate Authentication
    const authStatus = await this.validateAuthentication(requirement, requirement.projectId);
    categories.push(authStatus);
    if (authStatus.status === 'MISSING') overallStatus = 'INCOMPLETE';
    else if (authStatus.status === 'WARNING' && overallStatus === 'READY') overallStatus = 'WARNING';

    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      categories,
      overallStatus,
    };
  }

  private async validateAPIs(requirement: RequirementEntity): Promise<ValidationCategory> {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    if (!requirement.relatedOperations || requirement.relatedOperations.length === 0) {
      status = 'MISSING';
      details.push('No API operations linked to this requirement');
    } else {
      for (const opId of requirement.relatedOperations) {
        const op = await this.apiOperationRepository.findById(opId);
        if (op) {
          details.push(`${op.method} ${op.path}`);
        } else {
          details.push(`Missing API operation: ${opId}`);
          status = 'MISSING';
        }
      }
    }

    return { name: 'APIs', status, details };
  }

  private async validateBusinessFlows(requirement: RequirementEntity): Promise<ValidationCategory> {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    if (!requirement.relatedFlows || requirement.relatedFlows.length === 0) {
      status = 'WARNING';
      details.push('No business flows linked to this requirement');
    } else {
      for (const flowId of requirement.relatedFlows) {
        const flow = await this.knowledgeFlowRepository.findById(flowId);
        if (flow) {
          details.push(flow.name);
        } else {
          details.push(`Missing flow: ${flowId}`);
          status = 'MISSING';
        }
      }
    }

    return { name: 'Business Flows', status, details };
  }

  private async validateDatasets(requirement: RequirementEntity): Promise<ValidationCategory> {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    if (!requirement.relatedDatasets || requirement.relatedDatasets.length === 0) {
      status = 'WARNING';
      details.push('No datasets linked to this requirement');
    } else {
      for (const dsId of requirement.relatedDatasets) {
        const ds = await this.datasetRepository.findById(dsId);
        if (ds) {
          details.push(ds.name);
        } else {
          details.push(`Missing dataset: ${dsId}`);
          status = 'MISSING';
        }
      }
    }

    return { name: 'Datasets', status, details };
  }

  private validateRuntimeVariables(requirement: RequirementWithRuntimeVariables): ValidationCategory {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    const variables = requirement.relatedRuntimeVariables || [];
    if (variables.length === 0) {
      status = 'WARNING';
      details.push('No runtime variables identified');
    } else {
      for (const variable of variables) {
        details.push(variable);
      }
    }

    return { name: 'Runtime Variables', status, details };
  }

  private async validateEnvironment(projectId: string): Promise<ValidationCategory> {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    const environments = await this.environmentRepository.findByProject(projectId);
    if (environments.length === 0) {
      status = 'MISSING';
      details.push('No environments configured');
    } else {
      for (const env of environments) {
        details.push(env.name);
      }
    }

    return { name: 'Environment', status, details };
  }

  private async validateAuthentication(requirement: RequirementEntity, projectId: string): Promise<ValidationCategory> {
    const details: string[] = [];
    let status: ValidationStatus = 'READY';

    // Check if requirement has authentication-related keywords
    const authKeywords = ['login', 'auth', 'token', 'password', 'session', 'otp', 'refresh'];
    const requirementText = `${requirement.title} ${requirement.description}`.toLowerCase();
    const requiresAuth = authKeywords.some(keyword => requirementText.includes(keyword));

    if (!requiresAuth) {
      status = 'WARNING';
      details.push('Requirement does not appear to require authentication');
      return { name: 'Authentication', status, details };
    }

    // Check for auth-related API operations
    const services = await this.apiServiceRepository.findByProject(projectId);
    const authOps: string[] = [];
    for (const service of services) {
      const ops = await this.apiOperationRepository.findByService(service.id);
      for (const op of ops) {
        const opText = `${op.name} ${op.path} ${op.description}`.toLowerCase();
        if (authKeywords.some(keyword => opText.includes(keyword))) {
          authOps.push(`${op.method} ${op.path}`);
        }
      }
    }

    if (authOps.length === 0) {
      status = 'MISSING';
      details.push('No authentication-related API operations found');
    } else {
      for (const op of authOps) {
        details.push(op);
      }
    }

    return { name: 'Authentication', status, details };
  }
}

export default ValidateRequirementReadiness;