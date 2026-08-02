// External libraries
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

// Assets
import logoLight from '../assets/images/logo-light.svg';
import logoDark from '../assets/images/logo-dark.svg';
import {
  LayoutDashboard,
  Code2,
  Server,
  BookOpen,
  TestTube,
  PlayCircle,
  BarChart3,
  Settings,
  FolderKanban,
  FileText,
  Database,
} from 'lucide-react';
import { projectStore } from '../store/projectStore';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Show only Projects link when no project is selected
  const showProjectsOnly = !selectedProjectId;

  const baseNavigationItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isDashboard: true },
    { to: '/apis', label: 'API', icon: Code2 },
    { to: '/environments', label: 'Environments', icon: Server },
    { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
    { to: '/requirements', label: 'Requirements', icon: FileText },
    { to: '/suites', label: 'Suites', icon: TestTube },
    { to: '/test-data', label: 'Test Data', icon: Database },
    { to: '/executions', label: 'Executions', icon: PlayCircle },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const navigationItems = showProjectsOnly
    ? [
        { to: '/projects', label: 'Projects', icon: FolderKanban },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    : baseNavigationItems;

  const isActiveRoute = (itemPath: string, isDashboard?: boolean) => {
    if (isDashboard) {
      // Highlight dashboard for both /dashboard and /projects/:id/dashboard
      return location.pathname === '/dashboard' || location.pathname.includes('/dashboard');
    }
    return location.pathname === itemPath;
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
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActiveRoute(item.to, item.isDashboard)
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
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-text-secondary">TestForge v0.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;