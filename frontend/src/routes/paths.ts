export const appPaths = {
  root: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  importCenter: '/import',
  settings: '/settings',
  showcase: '/showcase',
  projects: '/projects',
} as const;

export const projectModules = {
  overview: 'overview',
  apis: 'apis',
  apiExecution: 'api-execution',
  environment: 'environment',
  testData: 'testdata',
  knowledge: 'knowledge',
  requirements: 'requirements',
  execution: 'execution',
  reports: 'reports',
  review: 'review',
  recommendations: 'recommendations',
  pipeline: 'pipeline',
  notifications: 'notifications',
  versions: 'versions',
  audit: 'audit',
  plugins: 'plugins',
  aiProviders: 'ai-providers',
  context: 'context',
  prompts: 'prompts',
} as const;

export type ProjectModule = typeof projectModules[keyof typeof projectModules];

export const legacyProjectModuleRedirects = [
  { path: '/apis', module: projectModules.apis },
  { path: '/api-execution', module: projectModules.apiExecution },
  { path: '/environments', module: projectModules.apis },
  { path: '/knowledge', module: projectModules.knowledge },
  { path: '/reports', module: projectModules.reports },
  { path: '/notifications', module: projectModules.notifications },
  { path: '/versions', module: projectModules.versions },
  { path: '/audit', module: projectModules.audit },
  { path: '/plugins', module: projectModules.plugins },
  { path: '/ai-providers', module: projectModules.aiProviders },
  { path: '/recommendations', module: projectModules.recommendations },
  { path: '/pipeline', module: projectModules.pipeline },
  { path: '/context', module: projectModules.context },
  { path: '/prompts', module: projectModules.prompts },
] as const;

function joinSegments(...segments: Array<string | number | undefined | null>): string {
  return segments
    .flatMap((segment) => String(segment ?? '').split('/'))
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

export function projectRootPath(projectId: string): string {
  return joinSegments(appPaths.projects, projectId);
}

export function projectModuleRootPath(projectId: string, module: ProjectModule): string {
  return joinSegments(appPaths.projects, projectId, module);
}

export function projectModulePath(projectId: string, module: ProjectModule, subpath = ''): string {
  return `/${joinSegments(appPaths.projects, projectId, module, subpath)}`;
}
