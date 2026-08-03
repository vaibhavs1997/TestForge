// External libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRoutes } from './interfaces/api/ApiRoutes';
import { environmentRoutes } from './interfaces/environment/routes';
import { datasetRoutes } from './interfaces/test-data/routes';
import { mappingRoutes } from './interfaces/test-data/mappingRoutes';
import { columnRoutes } from './interfaces/test-data/columnRoutes';
import { profileRoutes } from './interfaces/test-data/profileRoutes';
import { rowRoutes } from './interfaces/test-data/rowRoutes';
import { knowledgeRoutes } from './interfaces/knowledge/KnowledgeRoutes';
import { analysisRoutes } from './interfaces/analysis/AnalysisRoutes';
import { requirementRoutes } from './interfaces/requirements/RequirementRoutes';
import { executionRoutes } from './interfaces/execution/ExecutionRoutes';
import { recommendationRoutes } from './interfaces/recommendation/RecommendationRoutes';
import { pipelineRoutes } from './interfaces/pipeline/PipelineRoutes';
import { testSuiteRoutes } from './interfaces/suite/TestSuiteRoutes';
import { reportRoutes } from './interfaces/report/ReportRoutes';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api', environmentRoutes);
app.use('/api', datasetRoutes);
app.use('/api', mappingRoutes);
app.use('/api', columnRoutes);
app.use('/api', profileRoutes);
app.use('/api', rowRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api', analysisRoutes);
app.use('/api', requirementRoutes);
app.use('/api', executionRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', pipelineRoutes);
app.use('/api', testSuiteRoutes);
app.use('/api', reportRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});