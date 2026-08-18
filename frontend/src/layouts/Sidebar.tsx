// External libraries
import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

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
  Workflow,
  History,
  ScrollText,
  Puzzle,
  Bot,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { projectStore } from '../store/projectStore';

// Styles

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Primary workflow navigation - 8 items
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Get started', icon: LayoutDashboard },
  { key: 'apis', label: 'APIs', icon: FolderOpen },
  { key: 'environment', label: 'Environment', icon: Globe },
  { key: 'testdata', label: 'Test Data', icon: Database },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { key: 'requirements', label: 'Requirements', icon: ListChecks },
  { key: 'execution', label: 'Execution', icon: Play },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

// Administration section - collapsible
const ADMIN_NAV_ITEMS: NavItem[] = [
  { key: 'pipeline', label: 'Pipeline', icon: Workflow },
  { key: 'versions', label: 'Versions', icon: History },
  { key: 'audit', label: 'Audit', icon: ScrollText },
  { key: 'plugins', label: 'Plugins', icon: Puzzle },
  { key: 'ai-providers', label: 'AI Providers', icon: Bot },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Collapsible section state
  const [adminOpen, setAdminOpen] = useState(false);

  // Project-centric primary navigation (outside project workspace)
  const primaryNavigationItems = [
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/plugins', label: 'Plugins', icon: Puzzle },
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

  // Check if any admin item is active (to auto-expand the section)
  const adminKeys = ADMIN_NAV_ITEMS.map((i) => i.key);
  const isAdminActive = adminKeys.includes(activeProjectTab);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const tabPath = `/projects/${activeProjectId}/${item.key}`;
    const isActive = activeProjectTab === item.key;
    return (
      <NavLink
        key={item.key}
        to={tabPath}
        className={() =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-surface hover:text-text'
          }`
        }
      >
        <Icon className="h-4 w-4" aria-hidden />
        {item.label}
      </NavLink>
    );
  };

  const renderCollapsibleItem = (item: NavItem, indent: boolean = true) => {
    const Icon = item.icon;
    const tabPath = `/projects/${activeProjectId}/${item.key}`;
    const isActive = activeProjectTab === item.key;
    return (
      <NavLink
        key={item.key}
        to={tabPath}
        className={() =>
          `flex items-center gap-3 rounded-lg ${indent ? 'px-3 pl-9' : 'px-3'} py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-surface hover:text-text'
          }`
        }
      >
        <Icon className="h-4 w-4" aria-hidden />
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-surface">
      <div className='flex h-16 items-center border-b border-border px-7'>
        <div className="flex items-center">
          <span className="text-xl font-semibold tracking-tight text-text leading-none">TestForge</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
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
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          );
        })}

        {isInsideProject && activeProjectId && (
          <div className="pt-4">
            <div className="space-y-1">
              {PRIMARY_NAV_ITEMS.map(renderNavItem)}

              {/* Administration Section - Collapsible */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isAdminActive
                      ? 'text-text'
                      : 'text-text-secondary hover:bg-surface hover:text-text'
                  }`}
                  aria-expanded={adminOpen || isAdminActive}
                  aria-label="Toggle administration section"
                >
                  {adminOpen || isAdminActive ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                  <Shield className="h-4 w-4" aria-hidden />
                  Administration
                </button>
                {(adminOpen || isAdminActive) && (
                  <div className="mt-1 space-y-1">
                    {ADMIN_NAV_ITEMS.map((item) => renderCollapsibleItem(item))}
                  </div>
                )}
              </div>
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
