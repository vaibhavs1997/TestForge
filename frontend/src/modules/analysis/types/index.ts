// AI Project Analysis domain types
export type AnalysisStatus = 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';

export interface AnalysisCard {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  relatedOperations: string[];
  relatedFlows: string[];
  relatedDatasets: string[];
  relatedRuntimeVariables: string[];
  status: AnalysisStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AnalysisCardFormData {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  relatedOperations: string[];
  relatedFlows: string[];
  relatedDatasets: string[];
  relatedRuntimeVariables: string[];
  status: AnalysisStatus;
}