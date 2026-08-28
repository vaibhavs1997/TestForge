// External libraries
import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

import {
  Settings,
  FolderKanban,
  LayoutDashboard,
  FolderOpen,
  Database,
  BookOpen,
  ListChecks,
  Play,
  BarChart3,
  Workflow,
  History,
  ScrollText,
  Bot,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
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
  { key: 'ai-providers', label: 'AI Providers', icon: Bot },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Collapsible section state
  const [adminOpen, setAdminOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Project-centric primary navigation (outside project workspace)
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

  // Check if any admin item is active (to auto-expand the section)
  const adminKeys = ADMIN_NAV_ITEMS.map((i) => i.key);
  const isAdminActive = adminKeys.includes(activeProjectTab);

  // Open automatically when entering an administration route, while still
  // allowing the user to collapse it afterward without being forced open.
  useEffect(() => {
    setAdminOpen(isAdminActive);
  }, [isAdminActive]);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const tabPath = `/projects/${activeProjectId}/${item.key}`;
    const isActive = activeProjectTab === item.key;
    return (
      <NavLink
        key={item.key}
        to={tabPath}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={() =>
          `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
            isActive
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-surface hover:text-text'
          }`
        }
      >
        <Icon className="h-4 w-4" aria-hidden />
        {!collapsed && item.label}
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
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={() =>
          `flex items-center gap-3 rounded-lg ${collapsed ? 'justify-center px-2' : indent ? 'px-3 pl-9' : 'px-3'} py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-surface hover:text-text'
          }`
        }
      >
        <Icon className="h-4 w-4" aria-hidden />
        {!collapsed && item.label}
      </NavLink>
    );
  };

  return (
    <aside className={`flex flex-shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className={`flex h-16 items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'justify-between px-7'}`}>
        {!collapsed && (
          <Link
            to="/projects"
            aria-label="Go to projects"
            className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="text-xl font-semibold leading-none tracking-tight text-text">TestForge</span>
          </Link>
        )}
        {collapsed && (
          <Link
            to="/projects"
            aria-label="Go to projects"
            className="rounded-sm text-sm font-semibold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            TF
          </Link>
        )}
      </div>
      <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-4'}`} aria-label="Main navigation">
        {collapsed && <div className='mb-3 flex justify-center'>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text"
            aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
          </button>
        </div>}
        {!isInsideProject && primaryNavigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
                  isActiveRoute(item.to)
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {!collapsed && item.label}
            </NavLink>
          );
        })}

        {isInsideProject && activeProjectId && (
          <div className="pt-4">
            <div className="space-y-1">
              {PRIMARY_NAV_ITEMS.map((item, index) => {
                if (!collapsed && index === 0) {
                  return (
                    <div key={item.key} className='flex items-center gap-1'>
                      <div className='min-w-0 flex-1'>{renderNavItem(item)}</div>
                      <button
                        type='button'
                        onClick={() => setCollapsed(true)}
                        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text'
                        aria-label='Collapse navigation sidebar'
                        title='Collapse sidebar'
                      >
                        <PanelLeftClose className='h-5 w-5' aria-hidden />
                      </button>
                    </div>
                  );
                }
                return renderNavItem(item);
              })}

              {/* Administration Section - Collapsible */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setAdminOpen(!adminOpen)}
                    className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
                    isAdminActive
                      ? 'text-text'
                      : 'text-text-secondary hover:bg-surface hover:text-text'
                  }`}
                  aria-expanded={adminOpen}
                  aria-label="Toggle administration section"
                  title={collapsed ? 'Administration' : undefined}
                >
                  {adminOpen ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                  <Shield className="h-4 w-4" aria-hidden />
                  {!collapsed && 'Administration'}
                </button>
                {!collapsed && adminOpen && (
                  <div className="mt-1 space-y-1">
                    {ADMIN_NAV_ITEMS.map((item) => renderCollapsibleItem(item))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className={`border-t border-border ${collapsed ? 'p-2 text-center' : 'p-4'}`}>
        {!collapsed && <p className="text-xs text-text-secondary">TestForge v0.1.0</p>}
      </div>
    </aside>
  );
};

export default Sidebar;
