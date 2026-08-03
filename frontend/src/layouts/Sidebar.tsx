// External libraries
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Assets
import logoLight from '../assets/images/logo-light.svg';
import logoDark from '../assets/images/logo-dark.svg';
import { LayoutDashboard, PlayCircle, BarChart3, Settings, FolderKanban } from 'lucide-react';
import { projectStore } from '../store/projectStore';

// Styles

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Project-centric primary navigation
  const primaryNavigationItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/executions', label: 'Execution', icon: PlayCircle },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

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
        {primaryNavigationItems.map((item) => {
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
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-text-secondary">TestForge v0.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;