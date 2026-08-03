// External libraries
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Assets
import logoLight from '../assets/images/logo-light.svg';
import logoDark from '../assets/images/logo-dark.svg';
import {
  Settings,
  FolderKanban,
  LayoutDashboard,
  FolderOpen,
  Globe,
  Database,
  BookOpen,
  ListChecks,
  Play,
  BarChart3,
  Sparkles,
  FlaskConical,
  GitBranch,
  Workflow,
  CalendarClock,
  Bell,
  History,
  ScrollText,
} from 'lucide-react';
import { projectStore } from '../store/projectStore';

// Styles

const PROJECT_TAB_ITEMS: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'apis', label: 'APIs', icon: FolderOpen },
  { key: 'environment', label: 'Environment', icon: Globe },
  { key: 'testdata', label: 'Test Data', icon: Database },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { key: 'requirements', label: 'Requirements', icon: ListChecks },
  { key: 'execution', label: 'Execution', icon: Play },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'recommendations', label: 'Recommendations', icon: Sparkles },
  { key: 'suites', label: 'Suites', icon: FlaskConical },
  { key: 'analysis', label: 'Analysis', icon: GitBranch },
  { key: 'pipeline', label: 'Pipeline', icon: Workflow },
  { key: 'scheduler', label: 'Scheduler', icon: CalendarClock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'versions', label: 'Versions', icon: History },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Project-centric primary navigation
  const primaryNavigationItems = [
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Detect if we are inside a project workspace
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const isInsideProject = !!projectMatch;
  const activeProjectId = projectMatch?.[1] || selectedProjectId;

  // Determine active project tab from URL
  const projectPathParts = location.pathname.split('/');
  const activeProjectTab = projectPathParts.length >= 4 ? projectPathParts[3] : 'overview';

  const isActiveRoute = (itemPath: string) => {
    if (itemPath === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(itemPath);
  };

  const handleLogoClick = () => {
    window.location.href = '/projects';
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-surface">
      <div className='flex h-16 items-center border-b border-border px-6'>
        <button
          onClick={handleLogoClick}
          className='transition-opacity hover:opacity-80'
          aria-label='TestForge home'
        >
          <img src={logoLight} alt='TestForge' className='block h-8 w-auto dark:hidden' />
          <img src={logoDark} alt='TestForge' className='hidden h-8 w-auto dark:block' />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {!isInsideProject && primaryNavigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActiveRoute(item.to)
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}

        {isInsideProject && activeProjectId && (
          <div className="pt-4">
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Project
            </div>
            <div className="space-y-1">
              {PROJECT_TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                const tabPath = `/projects/${activeProjectId}/${tab.key}`;
                return (
                  <NavLink
                    key={tab.key}
                    to={tabPath}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeProjectTab === tab.key
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:bg-surface hover:text-text'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-text-secondary">TestForge v0.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;