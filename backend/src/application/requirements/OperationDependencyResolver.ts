import type { Dependency } from '../../domain/knowledge/DependencyEntity.js';
import type { KnowledgeFlowEntity } from '../../domain/knowledge/KnowledgeFlowEntity.js';
import type { RuntimeVariable } from '../../domain/knowledge/RuntimeVariableEntity.js';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import type { OperationDependency, TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';

export interface DependencyResolutionResult { dependencies: OperationDependency[]; warnings: string[]; }

/** Resolves only evidence-backed prerequisites; it never guesses from names or HTTP methods. */
export class OperationDependencyResolver {
  resolveForDesign(
    design: Pick<TestDesignEntity, 'operationId' | 'runtimeBindings'>,
    designs: Array<Pick<TestDesignEntity, 'operationId' | 'runtimeBindings'>>,
    flows: KnowledgeFlowEntity[],
    runtimeVariables: RuntimeVariable[],
    projectDependencies: Dependency[],
    operations: ApiOperationEntity[],
  ): DependencyResolutionResult {
    const warnings: string[] = [];
    const operationIds = new Set(operations.map((operation) => operation.id));
    const dependencies: OperationDependency[] = [];
    const add = (dependency: OperationDependency) => {
      if (!operationIds.has(dependency.sourceOperationId) || !operationIds.has(dependency.targetOperationId)) {
        warnings.push(`Ignored dependency with missing operation: ${dependency.sourceOperationId} -> ${dependency.targetOperationId}`);
        return;
      }
      if (dependency.sourceOperationId === dependency.targetOperationId) return;
      if (!dependencies.some((item) => item.sourceOperationId === dependency.sourceOperationId && item.targetOperationId === dependency.targetOperationId && item.targetRequestPath === dependency.targetRequestPath)) dependencies.push(dependency);
    };

    for (const flow of flows) {
      if (!flow.steps?.length) continue;
      const targetIndexes = flow.steps.map((step, index) => step.linkedApiOperationId === design.operationId ? index : -1).filter((index) => index >= 0);
      for (const targetIndex of targetIndexes) {
        for (let index = 0; index < targetIndex; index += 1) {
          const source = flow.steps[index].linkedApiOperationId;
          if (source && source !== design.operationId) add({ sourceOperationId: source, targetOperationId: design.operationId, evidence: [`knowledge-flow:${flow.id}`] });
        }
      }
    }

    for (const binding of design.runtimeBindings || []) {
      if (binding.source !== 'response') continue;
      const producers = designs.filter((candidate) => candidate.operationId && candidate.operationId !== design.operationId && candidate.runtimeBindings?.some((candidateBinding) => candidateBinding.source === 'response' && candidateBinding.variable === binding.variable));
      if (producers.length === 1) {
        const producerBinding = producers[0].runtimeBindings.find((item) => item.variable === binding.variable);
        add({ sourceOperationId: producers[0].operationId, targetOperationId: design.operationId, sourceResponsePath: producerBinding?.path, targetRequestPath: binding.path, evidence: [`runtime-binding:${binding.variable}`] });
      } else if (producers.length > 1) warnings.push(`Ambiguous producer for runtime variable ${binding.variable}; dependency not inferred.`);
    }

    for (const variable of runtimeVariables) {
      if (variable.linkedApiOperationIds.includes(design.operationId) && variable.linkedApiOperationIds.length > 2) warnings.push(`Runtime variable ${variable.id} has no directional producer; dependency not inferred.`);
    }
    for (const dependency of projectDependencies) {
      if (dependency.linkedApiOperationIds.includes(design.operationId) && dependency.linkedApiOperationIds.length > 1) warnings.push(`Project dependency ${dependency.id} has no directional operation evidence; dependency not inferred.`);
    }

    const graph = new Map<string, string[]>();
    for (const flow of flows) {
      for (let targetIndex = 0; targetIndex < (flow.steps?.length || 0); targetIndex += 1) {
        const target = flow.steps[targetIndex].linkedApiOperationId;
        if (!target) continue;
        for (let sourceIndex = 0; sourceIndex < targetIndex; sourceIndex += 1) {
          const source = flow.steps[sourceIndex].linkedApiOperationId;
          if (source && operationIds.has(source) && operationIds.has(target) && source !== target) graph.set(source, [...(graph.get(source) || []), target]);
        }
      }
    }
    for (const dependency of dependencies) graph.set(dependency.sourceOperationId, [...(graph.get(dependency.sourceOperationId) || []), dependency.targetOperationId]);
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (operationId: string) => {
      if (visiting.has(operationId)) { warnings.push(`Dependency cycle detected at operation ${operationId}; cyclic edge retained for review.`); return; }
      if (visited.has(operationId)) return;
      visiting.add(operationId);
      for (const next of graph.get(operationId) || []) visit(next);
      visiting.delete(operationId);
      visited.add(operationId);
    };
    for (const operationId of graph.keys()) visit(operationId);
    return { dependencies, warnings };
  }
}

export const operationDependencyResolver = new OperationDependencyResolver();
export default operationDependencyResolver;
