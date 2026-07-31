// Mock data for Dashboard module

export interface DashboardSummaryCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'test' | 'suite' | 'report' | 'project';
  status: 'success' | 'failed' | 'running' | 'pending';
}

export interface DashboardData {
  summaryCards: DashboardSummaryCard[];
  recentActivity: DashboardActivity[];
}

export const mockDashboardData: DashboardData = {
  summaryCards: [
    {
      title: 'Total Projects',
      value: '12',
      change: '+2 this month',
      trend: 'up',
      icon: null,
    },
    {
      title: 'Test Suites',
      value: '48',
      change: '+6 this month',
      trend: 'up',
      icon: null,
    },
    {
      title: 'API Services',
      value: '156',
      change: '+12 this month',
      trend: 'up',
      icon: null,
    },
    {
      title: 'Success Rate',
      value: '94.2%',
      change: '-1.3% from last week',
      trend: 'down',
      icon: null,
    },
  ],
  recentActivity: [
    {
      id: '1',
      title: 'User Authentication API Tests',
      description: 'Test suite passed with 42 out of 45 tests',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'test',
      status: 'success',
    },
    {
      id: '2',
      title: 'Payment Service Integration',
      description: 'Test suite failed with 3 failing tests',
      timestamp: '2024-01-15T09:15:00Z',
      type: 'suite',
      status: 'failed',
    },
    {
      id: '3',
      title: 'Regression Suite #1',
      description: 'Suite is currently running',
      timestamp: '2024-01-15T08:45:00Z',
      type: 'suite',
      status: 'running',
    },
    {
      id: '4',
      title: 'Performance Report Q1',
      description: 'Report generated successfully',
      timestamp: '2024-01-14T16:20:00Z',
      type: 'report',
      status: 'success',
    },
    {
      id: '5',
      title: 'API Documentation Tests',
      description: 'Test suite completed with pending review',
      timestamp: '2024-01-14T14:10:00Z',
      type: 'test',
      status: 'pending',
    },
    {
      id: '6',
      title: 'E-Commerce Platform',
      description: 'New project created with initial configuration',
      timestamp: '2024-01-14T10:00:00Z',
      type: 'project',
      status: 'success',
    },
  ],
};