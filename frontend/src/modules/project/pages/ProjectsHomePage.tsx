import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectStore } from '../../../store/projectStore';
import { useToast } from '../../../hooks/useToast';
import { useWorkspaceProjects } from '../hooks/useWorkspaceProjects';
import { getLastOpenedAt, touchProjectOpened } from '../utils/projectUiMeta';
import type { Project as ApiProject } from '../../../services/ProjectService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { CreateProjectModal, type CreateProjectModalData } from '../components/CreateProjectModal';
import { RenameProjectModal } from '../components/RenameProjectModal';
import { ProjectCardMenu } from '../components/ProjectCardMenu';
import { Plus, LayoutGrid, Clock, User, FolderPlus } from 'lucide-react';

export interface ProjectsHomePageProps {}

interface Activity {
  id: string;
  action: string;
  projectName: string;
  user: string;
  timestamp: string;
}

const MAX_RECENT_PROJECTS = 4;

type UiProject = ApiProject & {
  icon: React.ReactNode;
  lastOpenedAt: number;
  uiStatus: 'active' | 'paused';
};

function toUiProject(p: ApiProject): UiProject {
  const archived = p.status === 'archived';
  return {
    ...p,
    icon: <FolderPlus className="h-8 w-8" />,
    lastOpenedAt: getLastOpenedAt(p.id, p.updatedAt),
    uiStatus: archived ? 'paused' : 'active',
  };
}

export const ProjectsHomePage: React.FC<ProjectsHomePageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [renameProject, setRenameProject] = React.useState<UiProject | undefined>(undefined);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteProject, setDeleteProject] = React.useState<UiProject | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [archiveProject, setArchiveProject] = React.useState<UiProject | undefined>(undefined);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [recentActivity, setRecentActivity] = React.useState<Activity[]>([]);

  const {
    projects: apiProjects,
    isLoading,
    isError,
    error,
    refetch,
    createProjectAsync,
    updateProjectAsync,
    deleteProjectAsync,
  } = useWorkspaceProjects();

  const projects = React.useMemo(() => apiProjects.map(toUiProject), [apiProjects]);

  const navigate = useNavigate();
  const { toast, showSuccess, showError } = useToast();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  React.useEffect(() => {
    if (selectedProjectId) {
      setSelectedProjectId(null);
    }
  }, [selectedProjectId, setSelectedProjectId]);

  const logActivity = (action: string, projectName: string) => {
    setRecentActivity((prev) => [
      {
        id: Date.now().toString(),
        action,
        projectName,
        user: 'You',
        timestamp: 'Just now',
      },
      ...prev,
    ]);
  };

  const filteredProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? projects.filter(
          (project) =>
            project.name.toLowerCase().includes(term) ||
            (project.description ?? '').toLowerCase().includes(term),
        )
      : projects;
    return [...filtered].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }, [projects, search]);

  const displayedProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? filteredProjects : filteredProjects.slice(0, MAX_RECENT_PROJECTS);
  }, [filteredProjects, search]);

  const showViewAllProjects = projects.length > MAX_RECENT_PROJECTS;

  const getStatusBadge = (status: UiProject['uiStatus']) => (
    <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status === 'active' ? 'active' : 'paused'}</Badge>
  );

  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const formatAbsoluteTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleCreateProject = async (data: CreateProjectModalData) => {
    try {
      await createProjectAsync({
        name: data.projectName,
        id: data.projectId,
        projectKey: data.projectId.toLowerCase(),
        description: data.description || undefined,
      });
      touchProjectOpened(data.projectId);
      logActivity(`Created project "${data.projectName}"`, data.projectName);
      setCreateModalOpen(false);
      showSuccess(`Project "${data.projectName}" created successfully`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenProject = (project: UiProject) => {
    touchProjectOpened(project.id);
    logActivity(`Opened project "${project.name}"`, project.name);
    setSelectedProjectId(project.id);
    navigate(`/projects/${project.id}/overview`);
  };

  const handleRenameProject = async (newName: string) => {
    if (!renameProject) return;
    const oldName = renameProject.name;
    try {
      await updateProjectAsync({ id: renameProject.id, name: newName });
      logActivity(`Renamed project "${oldName}" to "${newName}"`, newName);
      setRenameOpen(false);
      setRenameProject(undefined);
      showSuccess(`Project renamed to "${newName}" successfully`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    const deletedName = deleteProject.name;
    try {
      await deleteProjectAsync(deleteProject.id);
      logActivity(`Deleted project "${deletedName}"`, deletedName);
      setDeleteOpen(false);
      setDeleteProject(undefined);
      showSuccess(`Project "${deletedName}" deleted successfully`);
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Failed to delete project');
    }
  };

  const handleArchiveProject = async () => {
    if (!archiveProject) return;
    const archivedName = archiveProject.name;
    try {
      await updateProjectAsync({ id: archiveProject.id, status: 'archived' });
      logActivity(`Archived project "${archivedName}"`, archivedName);
      setArchiveOpen(false);
      setArchiveProject(undefined);
      showSuccess(`Project "${archivedName}" archived successfully`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold text-text">Select a Project</h1>
        <p className="mt-2 text-sm text-text-secondary">Loading projects…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ErrorAlert
          title="Failed to load projects"
          message={error?.message ?? 'Could not reach the API.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Select a Project</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Create a new project or continue working on an existing API validation workspace.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Project
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." className="sm:w-96" />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Recent Projects</h2>
          {showViewAllProjects && (
            <Button variant="ghost" size="sm">
              View All Projects →
            </Button>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-12 w-12" />}
            title="No projects found"
            description={search ? 'Try adjusting your search criteria.' : 'Create your first project to get started.'}
            action={search ? undefined : { label: 'Create Project', onClick: () => setCreateModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleOpenProject(project)}
              >
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="text-primary">{project.icon}</div>
                    <ProjectCardMenu
                      onRename={() => {
                        setRenameProject(project);
                        setRenameOpen(true);
                      }}
                      onArchive={() => {
                        setArchiveProject(project);
                        setArchiveOpen(true);
                      }}
                      onDelete={() => {
                        setDeleteProject(project);
                        setDeleteOpen(true);
                      }}
                    />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-text">{project.name}</h3>
                  <p className="mb-4 line-clamp-2 text-xs text-text-secondary">
                    {project.description || 'No description'}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Last opened</span>
                      <span className="font-medium text-text">{formatRelativeTime(project.lastOpenedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Last updated</span>
                      <span className="font-medium text-text">{formatAbsoluteTime(project.updatedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Status</span>
                      {getStatusBadge(project.uiStatus)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-text-secondary">Actions on this page will appear here.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">{activity.action}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                        <User className="h-3 w-3" />
                        <span>{activity.user}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start a New API Validation Project</CardTitle>
            <CardDescription>
              Create a project to organize API contracts, environments, test suites and execution reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={(data) => void handleCreateProject(data)}
        existingProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <RenameProjectModal
        open={renameOpen}
        currentName={renameProject?.name ?? ''}
        onClose={() => {
          setRenameOpen(false);
          setRenameProject(undefined);
        }}
        onSave={(name) => void handleRenameProject(name)}
        existingNames={projects.map((p) => p.name)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Project"
        message={`Deleting "${deleteProject?.name}" removes the project and its workspace data from this machine.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleDeleteProject()}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteProject(undefined);
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        title="Archive Project"
        message={`Archiving "${archiveProject?.name}" will mark it as paused.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => void handleArchiveProject()}
        onCancel={() => {
          setArchiveOpen(false);
          setArchiveProject(undefined);
        }}
      />

      {toast}
    </div>
  );
};

export default ProjectsHomePage;
