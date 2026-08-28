import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectStore } from '../../../store/projectStore';
import { useToast } from '../../../hooks/useToast';
import { useWorkspaceProjects } from '../hooks/useWorkspaceProjects';
import type { ProjectDto, ProjectWorkspaceModel } from '../../../types/apiModels';
import { toProjectWorkspaceModel } from '../../../types/apiModels';
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
import { Plus, LayoutGrid, Clock, FolderPlus, ArrowRight, ListChecks } from 'lucide-react';
import { consumeAuthFlash } from '../../../utils/authFlash';
import { projectModulePath } from '../../../routes/paths';

export interface ProjectsHomePageProps {}

const MAX_RECENT_PROJECTS = 4;

type UiProject = ProjectWorkspaceModel & {
  icon: React.ReactNode;
};

function toUiProject(p: ProjectDto): UiProject {
  return {
    ...toProjectWorkspaceModel(p, p.lastOpenedAt ?? p.updatedAt),
    icon: <FolderPlus className="h-8 w-8" />,
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
  const [showAllProjects, setShowAllProjects] = React.useState(false);

  const {
    projects: apiProjects,
    isLoading,
    isError,
    error,
    refetch,
    createProjectAsync,
    updateProjectAsync,
    deleteProjectAsync,
    recordProjectOpenAsync,
    isCreating,
    isUpdating,
    isDeleting,
    recentActivity = [],
  } = useWorkspaceProjects();

  const projects = React.useMemo(() => apiProjects.map(toUiProject), [apiProjects]);

  const navigate = useNavigate();
  const { toast, showSuccess, showError } = useToast();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);
  const initialSelectedProjectIdRef = React.useRef(projectStore.getState().selectedProjectId);

  React.useEffect(() => {
    const flash = consumeAuthFlash();
    if (flash?.type === 'success') {
      showSuccess(flash.message);
    } else if (flash?.type === 'error') {
      showError(flash.message);
    }
  }, [showSuccess, showError]);

  React.useEffect(() => {
    if (initialSelectedProjectIdRef.current) {
      setSelectedProjectId(null);
    }
  }, [setSelectedProjectId]);

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

  const activeProjects = React.useMemo(
    () => filteredProjects.filter((project) => project.uiStatus === 'active'),
    [filteredProjects],
  );

  const archivedProjects = React.useMemo(
    () => filteredProjects.filter((project) => project.uiStatus === 'archived'),
    [filteredProjects],
  );

  const displayedProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term || showAllProjects) return activeProjects;
    return activeProjects.slice(0, MAX_RECENT_PROJECTS);
  }, [activeProjects, search, showAllProjects]);

  const showViewAllProjects = activeProjects.length > MAX_RECENT_PROJECTS;

  const getStatusBadge = (status: UiProject['uiStatus']) => (
    <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status}</Badge>
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
      const created = await createProjectAsync({
        name: data.projectName,
        description: data.description || undefined,
      });
      setCreateModalOpen(false);
      showSuccess(`Project "${data.projectName}" created successfully`);
      setSelectedProjectId(created.id);
      navigate(projectModulePath(created.id, 'overview'));
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Failed to create project');
    }
  };

  const handleOpenProject = (project: UiProject) => {
    setSelectedProjectId(project.id);
    void recordProjectOpenAsync(project.id).catch(() => undefined);
    navigate(projectModulePath(project.id, 'overview'));
  };

  const handleRenameProject = async (newName: string) => {
    if (!renameProject) return;
    try {
      await updateProjectAsync({ id: renameProject.id, name: newName });
      setRenameOpen(false);
      setRenameProject(undefined);
      showSuccess(`Project renamed to "${newName}" successfully`);
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Failed to rename project');
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    const deletedName = deleteProject.name;
    try {
      await deleteProjectAsync(deleteProject.id);
      setDeleteOpen(false);
      setDeleteProject(undefined);
      showSuccess(`Project "${deletedName}" deleted successfully`);
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : 'Failed to delete project');
    }
  };

  const handleToggleArchiveProject = async () => {
    if (!archiveProject) return;
    const nextStatus = archiveProject.status === 'archived' ? 'active' : 'archived';
    const actionLabel = nextStatus === 'archived' ? 'Archived' : 'Unarchived';
    const successLabel = nextStatus === 'archived' ? 'archived successfully' : 'restored successfully';
    try {
      await updateProjectAsync({ id: archiveProject.id, status: nextStatus });
      setArchiveOpen(false);
      setArchiveProject(undefined);
      showSuccess(`Project "${archiveProject.name}" ${successLabel}`);
    } catch (e) {
      console.error(e);
      showError(e instanceof Error ? e.message : `Failed to ${actionLabel.toLowerCase()} project`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-8 lg:px-8">
        <h1 className="text-3xl font-bold text-text">Select a Project</h1>
        <p className="mt-2 text-sm text-text-secondary">Loading projects…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full px-4 py-8 lg:px-8">
        <ErrorAlert
          title="Failed to load projects"
          message={error?.message ?? 'Could not reach the API.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." className="sm:w-96" />
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Project
        </Button>
      </div>

      <section className="mb-8 rounded-2xl border border-border bg-surface/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Recent Projects</h2>
          {showViewAllProjects && !search.trim() && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllProjects((v) => !v)}>
              {showAllProjects ? 'Show fewer' : `View all ${activeProjects.length} active projects →`}
            </Button>
          )}
        </div>

        {activeProjects.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-12 w-12" />}
            title="No projects found"
            description={
              search
                ? 'Try adjusting your search criteria.'
                : archivedProjects.length > 0
                  ? 'All of your projects are archived right now.'
                  : 'Create your first project to get started.'
            }
            action={search ? undefined : { label: 'Create Project', onClick: () => setCreateModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedProjects.map((project) => (
              <Card
                key={project.id}
                className="transition-shadow hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="text-primary">{project.icon}</div>
                    <ProjectCardMenu
                      onRename={() => {
                        setRenameProject(project);
                        setRenameOpen(true);
                      }}
                      onToggleArchive={() => {
                        setArchiveProject(project);
                        setArchiveOpen(true);
                      }}
                      onDelete={() => {
                        setDeleteProject(project);
                        setDeleteOpen(true);
                      }}
                      isArchived={project.status === 'archived'}
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
                    <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => handleOpenProject(project)}>
                      Open project
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-text-secondary">Project opens and lifecycle changes will appear here.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text">{activity.action.toLowerCase()}</p>
                        <span className="text-xs text-text-secondary">·</span>
                        <Clock className="h-3 w-3 text-text-secondary" />
                        <span className="text-xs text-text-secondary">{formatRelativeTime(activity.timestamp)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-text-secondary">{activity.newValue?.name ?? 'Project activity'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Archived Projects</CardTitle>
            </div>
            <Badge variant="secondary">{archivedProjects.length}</Badge>
          </CardHeader>
          <CardContent>
            {archivedProjects.length === 0 ? (
              <p className="text-sm text-text-secondary">
                {search.trim() ? 'No archived projects match your search.' : 'Archived projects will appear here.'}
              </p>
            ) : (
              <div className="space-y-2">
                {archivedProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2">
                    <span className="truncate text-sm font-semibold text-text">{project.name}</span>
                    <Button size="sm" onClick={() => { setArchiveProject(project); setArchiveOpen(true); }}>Restore</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>New project checklist</CardTitle>
            <CardDescription>
              After you create a project, use Get started inside the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <div className="flex gap-2">
              <ListChecks className="h-4 w-4 shrink-0 text-primary" />
              <span>Import API contract</span>
            </div>
            <div className="flex gap-2">
              <ListChecks className="h-4 w-4 shrink-0 text-primary" />
              <span>Set environment base URL</span>
            </div>
            <div className="flex gap-2">
              <ListChecks className="h-4 w-4 shrink-0 text-primary" />
              <span>Add requirements &amp; generate tests</span>
            </div>
            <div className="flex gap-2">
              <ListChecks className="h-4 w-4 shrink-0 text-primary" />
              <span>Run tests and review report</span>
            </div>
            <Button className="w-full mt-2" size="lg" onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create project
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={(data) => void handleCreateProject(data)}
        existingProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
        isSaving={isCreating}
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
        isSaving={isUpdating}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Project"
        message={`Deleting "${deleteProject?.name}" removes the project and its workspace data from this machine.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => void handleDeleteProject()}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteProject(undefined);
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        title={archiveProject?.status === 'archived' ? 'Unarchive Project' : 'Archive Project'}
        message={
          archiveProject?.status === 'archived'
            ? `Restoring "${archiveProject?.name}" will make it active again.`
            : `Archiving "${archiveProject?.name}" will mark it as paused.`
        }
        confirmLabel={archiveProject?.status === 'archived' ? 'Unarchive' : 'Archive'}
        cancelLabel="Cancel"
        variant="default"
        isLoading={isUpdating}
        onConfirm={() => void handleToggleArchiveProject()}
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
