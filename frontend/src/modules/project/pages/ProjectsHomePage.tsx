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
import { Building2, CreditCard, ShoppingCart, Users, Plus, LayoutGrid, Clock, User } from 'lucide-react';

// Styles

export interface ProjectsHomePageProps {}

interface Project {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  lastOpened: string;
  lastUpdated: string;
  status: 'active' | 'paused';
}

interface Activity {
  id: string;
  action: string;
  projectName: string;
  user: string;
  timestamp: string;
}

export const ProjectsHomePage: React.FC<ProjectsHomePageProps> = () => {
  const [search, setSearch] = React.useState('');
  const navigate = useNavigate();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Clear project selection when on projects page
  React.useEffect(() => {
    if (selectedProjectId) {
      setSelectedProjectId(null);
    }
  }, []);

  const projects: Project[] = [
    {
      id: '1',
      name: 'Banking API',
      description: 'Core banking services and operations API validation',
      icon: <Building2 className='h-8 w-8' />,
      lastOpened: '2 hours ago',
      lastUpdated: 'Today, 10:30 AM',
      status: 'active',
    },
    {
      id: '2',
      name: 'Payment Gateway',
      description: 'Payment processing and transaction APIs',
      icon: <CreditCard className='h-8 w-8' />,
      lastOpened: '1 day ago',
      lastUpdated: 'Yesterday, 4:15 PM',
      status: 'active',
    },
    {
      id: '3',
      name: 'E-Commerce Platform',
      description: 'E-commerce platform APIs and integrations',
      icon: <ShoppingCart className='h-8 w-8' />,
      lastOpened: '3 days ago',
      lastUpdated: 'May 14, 2024',
      status: 'active',
    },
    {
      id: '4',
      name: 'User Management',
      description: 'User service and authentication APIs validation',
      icon: <Users className='h-8 w-8' />,
      lastOpened: '1 week ago',
      lastUpdated: 'May 10, 2024',
      status: 'paused',
    },
  ];

  const recentActivity: Activity[] = [
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
  ];

  const filteredProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term)
    );
  }, [search]);

  const getStatusBadge = (status: Project['status']) => {
    return <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status}</Badge>;
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
        <Button onClick={() => {
          const newProjectId = Date.now().toString();
          setSelectedProjectId(newProjectId);
          navigate(`/projects/${newProjectId}/dashboard`);
        }}>
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
          <Button variant='ghost' size='sm'>
            View All Projects →
          </Button>
        </div>

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className='h-12 w-12' />}
            title='No projects found'
            description={search ? 'Try adjusting your search criteria.' : 'Create your first project to get started.'}
            action={search ? undefined : { label: 'Create Project', onClick: () => {
              const newProjectId = Date.now().toString();
              setSelectedProjectId(newProjectId);
              navigate(`/projects/${newProjectId}/dashboard`);
            }}}
          />
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className='cursor-pointer transition-shadow hover:shadow-lg'
                onClick={() => {
                  setSelectedProjectId(project.id);
                  navigate(`/projects/${project.id}/dashboard`);
                }}
              >
                <CardContent className='pt-6'>
                  <div className='mb-4 flex items-start justify-between'>
                    <div className='text-primary'>{project.icon}</div>
                    <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                      <span className='sr-only'>More options</span>
                      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
                        <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
                      </svg>
                    </Button>
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
              <Button variant='ghost' size='sm'>
                View All Activity →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.map((activity) => (
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
            <Button className='w-full' size='lg' onClick={() => {
              const newProjectId = Date.now().toString();
              setSelectedProjectId(newProjectId);
              navigate(`/projects/${newProjectId}/dashboard`);
            }}>
              <Plus className='mr-2 h-4 w-4' />
              Create Project
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectsHomePage;