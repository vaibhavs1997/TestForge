// Mock data for services tied to existing projects
import type { Service } from '../types';

export const initialServices: Service[] = [
  {
    id: 's1',
    projectId: '1',
    name: 'Catalog API',
    description: 'Product catalog and inventory APIs',
    protocol: 'REST',
    baseUrl: 'https://api.example.com/catalog',
    version: 'v1',
    status: 'Active',
    createdDate: '2024-01-20T08:00:00.000Z',
    updatedDate: '2024-06-15T10:30:00.000Z'
  },
  {
    id: 's2',
    projectId: '1',
    name: 'Checkout Service',
    description: 'Checkout and payments',
    protocol: 'GraphQL',
    baseUrl: 'https://api.example.com/checkout',
    version: 'v2',
    status: 'Active',
    createdDate: '2024-02-10T09:15:00.000Z',
    updatedDate: '2024-07-02T14:20:00.000Z'
  },
  {
    id: 's3',
    projectId: '2',
    name: 'Identity Provider',
    description: 'SSO and user directory',
    protocol: 'SOAP',
    baseUrl: 'https://id.example.com',
    version: 'v3',
    status: 'Inactive',
    createdDate: '2024-03-05T11:10:00.000Z',
    updatedDate: '2024-06-28T16:45:00.000Z'
  },
  {
    id: 's4',
    projectId: '3',
    name: 'Metrics Ingest',
    description: 'Telemetry ingestion endpoint',
    protocol: 'gRPC',
    baseUrl: 'grpc://metrics.example.com:443',
    version: 'v1',
    status: 'Active',
    createdDate: '2024-04-12T07:55:00.000Z',
    updatedDate: '2024-06-30T09:05:00.000Z'
  },
  {
    id: 's5',
    projectId: '4',
    name: 'Push Gateway',
    description: 'Mobile push notification gateway',
    protocol: 'REST',
    baseUrl: 'https://push.example.com',
    version: 'v2',
    status: 'Inactive',
    createdDate: '2024-05-08T13:25:00.000Z',
    updatedDate: '2024-06-10T11:50:00.000Z'
  }
];