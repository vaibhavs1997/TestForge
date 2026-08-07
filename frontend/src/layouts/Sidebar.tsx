// External libraries
import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

// Assets
import { BrandLogo } from '../components/brand/BrandLogo';
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
  Workflow,
  Bell,
  History,
  ScrollText,
  Puzzle,
  Boxes,
  Send,
  Bot,
  ChevronDown,
  ChevronRight,
  Wrench,
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
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
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
  { key: 'recommendations', label: 'Recommendations', icon: Sparkles },
  { key: 'pipeline', label: 'Pipeline', icon: Workflow },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'versions', label: 'Versions', icon: History },
  { key: 'audit', label: 'Audit', icon: ScrollText },
  { key: 'plugins', label: 'Plugins', icon: Puzzle },
  { key: 'ai-providers', label: 'AI Providers', icon: Bot },
];

// Developer Tools section - collapsible, hidden by default
const DEV_TOOLS_NAV_ITEMS: NavItem[] = [
  { key: 'context', label: 'Context Viewer', icon: Boxes },
  { key: 'prompts', label: 'Prompt Builder', icon: Send },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);

  // Collapsible section state
  const [adminOpen, setAdminOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);

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
  const devToolsKeys = DEV_TOOLS_NAV_ITEMS.map((i) => i.key);
  const isDevToolsActive = devToolsKeys.includes(activeProjectTab);

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
        <Icon className="h-4 w-4" />
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
        <Icon className="h-4 w-4" />
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-surface">
      <div className='flex h-[4.5rem] items-center border-b border-border px-4'>
        <BrandLogo variant="sidebar" className="w-full max-w-none" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
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
            <div className="space-y-1">
              {PRIMARY_NAV_ITEMS.map(renderNavItem)}

              {/* Administration Section - Collapsible */}
              <div className="pt-3">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isAdminActive
                      ? 'text-text'
                      : 'text-text-secondary hover:bg-surface hover:text-text'
                  }`}
                  aria-expanded={adminOpen || isAdminActive}
                >
                  {adminOpen || isAdminActive ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Shield className="h-4 w-4" />
                  Administration
                </button>
                {(adminOpen || isAdminActive) && (
                  <div className="mt-1 space-y-1">
                    {ADMIN_NAV_ITEMS.map((item) => renderCollapsibleItem(item))}
                  </div>
                )}
              </div>

              {/* Developer Tools Section - Collapsible, hidden by default */}
              <div className="pt-3">
                <button
                  onClick={() => setDevToolsOpen(!devToolsOpen)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isDevToolsActive
                      ? 'text-text'
                      : 'text-text-secondary hover:bg-surface hover:text-text'
                  }`}
                  aria-expanded={devToolsOpen || isDevToolsActive}
                >
                  {devToolsOpen || isDevToolsActive ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Wrench className="h-4 w-4" />
                  Developer Tools
                </button>
                {(devToolsOpen || isDevToolsActive) && (
                  <div className="mt-1 space-y-1">
                    {DEV_TOOLS_NAV_ITEMS.map((item) => renderCollapsibleItem(item))}
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