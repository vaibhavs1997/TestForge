// AnalysisEntity - Domain Entity for AI Project Analysis
// Represents a deterministic analysis card produced by the project analyzer.

export type AnalysisStatus = 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';

export class AnalysisEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public title: string,
    public description: string,
    public category: string,
    public confidence: number,
    public relatedOperations: string[],
    public relatedFlows: string[],
    public relatedDatasets: string[],
    public relatedRuntimeVariables: string[],
    public status: AnalysisStatus,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default AnalysisEntity;