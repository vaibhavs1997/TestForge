import React from 'react';
import { useNavigate } from 'react-router-dom';
import { projectStore } from '../../../store/projectStore';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { CreateProjectModal, type CreateProjectModalData } from '../components/CreateProjectModal';
import { RenameProjectModal } from '../components/RenameProjectModal';
import { ProjectCardMenu } from '../components/ProjectCardMenu';
import { Building2, CreditCard, ShoppingCart, Users, Plus, LayoutGrid, Clock, User, FolderPlus } from 'lucide-react';

// Styles

export interface ProjectsHomePageProps {}

interface Project {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  lastOpened: string;
  lastUpdated: string;
  lastOpenedAt: number;
  status: 'active' | 'paused';
}

interface Activity {
  id: string;
  action: string;
  projectName: string;
  user: string;
  timestamp: string;
}

const PROJECTS_STORAGE_KEY = 'testforge_projects';
const MAX_RECENT_PROJECTS = 4;

const defaultProjects: Project[] = [
  {
    id: '1',
    name: 'Banking API',
    description: 'Core banking services and operations API validation',
    icon: <Building2 className='h-8 w-8' />,
    lastOpened: '2 hours ago',
    lastUpdated: 'Today, 10:30 AM',
    lastOpenedAt: Date.now() - 2 * 60 * 60 * 1000,
    status: 'active',
  },
  {
    id: '2',
    name: 'Payment Gateway',
    description: 'Payment processing and transaction APIs',
    icon: <CreditCard className='h-8 w-8' />,
    lastOpened: '1 day ago',
    lastUpdated: 'Yesterday, 4:15 PM',
    lastOpenedAt: Date.now() - 24 * 60 * 60 * 1000,
    status: 'active',
  },
  {
    id: '3',
    name: 'E-Commerce Platform',
    description: 'E-commerce platform APIs and integrations',
    icon: <ShoppingCart className='h-8 w-8' />,
    lastOpened: '3 days ago',
    lastUpdated: 'May 14, 2024',
    lastOpenedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    status: 'active',
  },
  {
    id: '4',
    name: 'User Management',
    description: 'User service and authentication APIs validation',
    icon: <Users className='h-8 w-8' />,
    lastOpened: '1 week ago',
    lastUpdated: 'May 10, 2024',
    lastOpenedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    status: 'paused',
  },
];

const loadProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Project[];
      // Icons are not serializable; restore default icons for known projects,
      // and use a generic icon for user-created projects.
      return parsed.map((p) => {
        const match = defaultProjects.find((d) => d.id === p.id);
        return { ...p, icon: match ? match.icon : <FolderPlus className='h-8 w-8' /> };
      });
    }
  } catch {
    // ignore parse errors and fall back to defaults
  }
  return defaultProjects;
};

export const ProjectsHomePage: React.FC<ProjectsHomePageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [renameProject, setRenameProject] = React.useState<Project | undefined>(undefined);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteProject, setDeleteProject] = React.useState<Project | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [archiveProject, setArchiveProject] = React.useState<Project | undefined>(undefined);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>(loadProjects);
  const [recentActivity, setRecentActivity] = React.useState<Activity[]>([
    {
      id: '1',
      action: 'Created project "Banking API"',
      projectName: 'Banking API',
      user: 'Admin',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      action: 'Opened project "Payment Gateway"',
      projectName: 'Payment Gateway',
      user: 'Admin',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      action: 'Renamed project "User Service" to "User Management"',
      projectName: 'User Management',
      user: 'Admin',
      timestamp: '3 days ago',
    },
    {
      id: '4',
      action: 'Archived project "Legacy APIs"',
      projectName: 'Legacy APIs',
      user: 'Admin',
      timestamp: '5 days ago',
    },
  ]);
  const navigate = useNavigate();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Clear project selection when on projects page
  React.useEffect(() => {
    if (selectedProjectId) {
      setSelectedProjectId(null);
    }
  }, []);

  // Persist projects to localStorage whenever they change
  React.useEffect(() => {
    try {
      // Strip non-serializable icon before storing
      const serializable = projects.map(({ icon, ...rest }) => rest);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [projects]);

  // Helper to log a new activity in real time
  const logActivity = (action: string, projectName: string) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      action,
      projectName,
      user: 'Admin',
      timestamp: 'Just now',
    };
    setRecentActivity((prev) => [newActivity, ...prev]);
  };

  // Filter by search and sort by most recently used first
  const filteredProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? projects.filter(
          (project) =>
            project.name.toLowerCase().includes(term) ||
            project.description.toLowerCase().includes(term)
        )
      : projects;
    return [...filtered].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }, [projects, search]);

  // Show only the 4 most recent projects when not searching;
  // when searching, show all matching results.
  const displayedProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? filteredProjects : filteredProjects.slice(0, MAX_RECENT_PROJECTS);
  }, [filteredProjects, search]);

  // "View All Projects" link only shows when there are more than 4 projects
  const showViewAllProjects = projects.length > MAX_RECENT_PROJECTS;

  const getStatusBadge = (status: Project['status']) => {
    return <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status}</Badge>;
  };

  const handleCreateProject = (data: CreateProjectModalData) => {
    const newProject: Project = {
      id: data.projectId,
      name: data.projectName,
      description: data.description || 'No description provided',
      icon: <FolderPlus className='h-8 w-8' />,
      lastOpened: 'Just now',
      lastUpdated: 'Just now',
      lastOpenedAt: Date.now(),
      status: 'active',
    };

    // Update state so the new project appears on the page immediately
    setProjects((prev) => [newProject, ...prev]);

    // Save to localStorage synchronously to ensure persistence even if the
    // component unmounts before the useEffect runs.
    try {
      const serializable = [newProject, ...projects].map(({ icon, ...rest }) => rest);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }

    // Log the create action in recent activity
    logActivity(`Created project "${data.projectName}"`, data.projectName);

    // Close the modal and keep the user on the projects page so they can see
    // the newly created project. They can click on it to open it.
    setCreateModalOpen(false);
  };

  const handleOpenProject = (project: Project) => {
    // Mark as most recently used so it shows first next time
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, lastOpenedAt: Date.now(), lastOpened: 'Just now' } : p
      )
    );
    // Log the open action in recent activity
    logActivity(`Opened project "${project.name}"`, project.name);
    setSelectedProjectId(project.id);
    navigate(`/projects/${project.id}/dashboard`);
  };

  const handleRenameProject = (newName: string) => {
    if (!renameProject) return;
    const oldName = renameProject.name;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === renameProject.id ? { ...p, name: newName, lastUpdated: 'Just now' } : p
      )
    );
    // Log the rename action in recent activity
    logActivity(`Renamed project "${oldName}" to "${newName}"`, newName);
    setRenameOpen(false);
    setRenameProject(undefined);
  };

  const handleDeleteProject = () => {
    if (!deleteProject) return;
    const deletedName = deleteProject.name;
    setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id));
    // Log the delete action in recent activity
    logActivity(`Deleted project "${deletedName}"`, deletedName);
    setDeleteOpen(false);
    setDeleteProject(undefined);
  };

  const handleArchiveProject = () => {
    if (!archiveProject) return;
    const archivedName = archiveProject.name;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === archiveProject.id ? { ...p, status: 'paused', lastUpdated: 'Just now' } : p
      )
    );
    // Log the archive action in recent activity
    logActivity(`Archived project "${archivedName}"`, archivedName);
    setArchiveOpen(false);
    setArchiveProject(undefined);
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-text'>Select a Project</h1>
          <p className='mt-2 text-sm text-text-secondary'>
            Create a new project or continue working on an existing API validation workspace.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Create New Project
        </Button>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search projects...' className='sm:w-96' />
      </div>

      {/* Recent Projects */}
      <div className='mb-8'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-text'>Recent Projects</h2>
          {showViewAllProjects && (
            <Button variant='ghost' size='sm'>
              View All Projects →
            </Button>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className='h-12 w-12' />}
            title='No projects found'
            description={search ? 'Try adjusting your search criteria.' : 'Create your first project to get started.'}
            action={search ? undefined : { label: 'Create Project', onClick: () => setCreateModalOpen(true) }}
          />
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {displayedProjects.map((project) => (
              <Card
                key={project.id}
                className='cursor-pointer transition-shadow hover:shadow-lg'
                onClick={() => handleOpenProject(project)}
              >
                <CardContent className='pt-6'>
                  <div className='mb-4 flex items-start justify-between'>
                    <div className='text-primary'>{project.icon}</div>
                    <ProjectCardMenu
                      onRename={() => { setRenameProject(project); setRenameOpen(true); }}
                      onArchive={() => { setArchiveProject(project); setArchiveOpen(true); }}
                      onDelete={() => { setDeleteProject(project); setDeleteOpen(true); }}
                    />
                  </div>
                  <h3 className='mb-2 text-base font-semibold text-text'>{project.name}</h3>
                  <p className='mb-4 text-xs text-text-secondary line-clamp-2'>{project.description}</p>
                  <div className='space-y-1'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Last opened</span>
                      <span className='font-medium text-text'>{project.lastOpened}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Last updated</span>
                      <span className='font-medium text-text'>{project.lastUpdated}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Status</span>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section: Recent Activity and Quick Actions */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Recent Activity */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Activity</CardTitle>
              {recentActivity.length > 4 && (
                <Button variant='ghost' size='sm'>
                  View All Activity →
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.slice(0, 4).map((activity) => (
                <div key={activity.id} className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900'>
                      <LayoutGrid className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                    </div>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-text'>{activity.action}</p>
                    <div className='mt-1 flex items-center gap-2 text-xs text-text-secondary'>
                      <div className='flex items-center gap-1'>
                        <User className='h-3 w-3' />
                        <span>{activity.user}</span>
                      </div>
                      <span>•</span>
                      <div className='flex items-center gap-1'>
                        <Clock className='h-3 w-3' />
                        <span>{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Start a New API Validation Project</CardTitle>
            <CardDescription>
              Create a project to organize API contracts, environments, test suites and execution reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className='w-full' size='lg' onClick={() => setCreateModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Create Project
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateProject}
        existingProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <RenameProjectModal
        open={renameOpen}
        currentName={renameProject?.name ?? ''}
        onClose={() => { setRenameOpen(false); setRenameProject(undefined); }}
        onSave={handleRenameProject}
        existingNames={projects.map((p) => p.name)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Project'
        message={`Deleting "${deleteProject?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDeleteProject}
        onCancel={() => { setDeleteOpen(false); setDeleteProject(undefined); }}
      />

      <ConfirmDialog
        open={archiveOpen}
        title='Archive Project'
        message={`Archiving "${archiveProject?.name}" will pause it. You can restore it later by changing its status.`}
        confirmLabel='Archive'
        cancelLabel='Cancel'
        variant='default'
        onConfirm={handleArchiveProject}
        onCancel={() => { setArchiveOpen(false); setArchiveProject(undefined); }}
      />
    </div>
  );
};

export default ProjectsHomePage;