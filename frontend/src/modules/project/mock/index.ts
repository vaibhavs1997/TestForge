// Mock data for projects
import type { Project } from '../types';

export const initialProjects: Project[] = [
  {
    id: '1',
    name: 'E-Commerce Platform',
    description: 'Main online storefront for retail operations',
    status: 'active',
    createdDate: '2024-01-15T08:30:00.000Z',
    updatedDate: '2024-06-20T14:22:00.000Z'
  },
  {
    id: '2',
    name: 'Customer Portal',
    description: 'Self-service portal for customer account management',
    status: 'active',
    createdDate: '2024-02-01T10:00:00.000Z',
    updatedDate: '2024-05-18T09:15:00.000Z'
  },
  {
    id: '3',
    name: 'Analytics Dashboard',
    description: 'Internal analytics and reporting platform',
    status: 'inactive',
    createdDate: '2024-03-10T07:45:00.000Z',
    updatedDate: '2024-07-01T11:30:00.000Z'
  },
  {
    id: '4',
    name: 'Mobile App Backend',
    description: 'API services for iOS and Android applications',
    status: 'active',
    createdDate: '2024-04-05T13:20:00.000Z',
    updatedDate: '2024-06-30T16:45:00.000Z'
  },
  {
    id: '5',
    name: 'Legacy Migration',
    description: 'Migration of legacy systems to modern architecture',
    status: 'inactive',
    createdDate: '2024-05-12T09:00:00.000Z',
    updatedDate: '2024-06-10T08:55:00.000Z'
  }
];