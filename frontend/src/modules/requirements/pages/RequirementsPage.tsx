// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FileText, Plus, CheckCircle, Clock, AlertCircle, ChevronDown, Play, Download, Upload, Sparkles } from 'lucide-react';

// Styles

export interface RequirementsPageProps {}

interface AcceptanceCriterion {
  id: string;
  text: string;
}

interface TestCase {
  id: string;
  name: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Positive' | 'Negative' | 'Boundary';
}

interface Suite {
  name: string;
  description: string;
}

export const RequirementsPage: React.FC<RequirementsPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [criteria, setCriteria] = React.useState<AcceptanceCriterion[]>([
    { id: '1', text: '1. User should be able to login with valid email and password.' },
    { id: '2', text: '2. Password is mandatory.' },
    { id: '3', text: '3. System should return JWT access token on successful login.' },
    { id: '4', text: '4. Invalid password should return 401 Unauthorized.' },
    { id: '5', text: '5. Locked account should return 423 Locked.' },
    { id: '6', text: '6. System should log login attempt (success/failure).' },
  ]);
  const [newCriteria, setNewCriteria] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState('Select Template');
  const [targetApi, setTargetApi] = React.useState('POST /auth/login');
  const [environment, setEnvironment] = React.useState('DEV (https://dev.api.company.com)');
  const [testCaseTypes, setTestCaseTypes] = React.useState({
    positive: true,
    negative: true,
    boundary: true,
    security: false,
    performance: false,
  });
  const [generatedTestCases] = React.useState<TestCase[]>([
    { id: 'TC-001', name: 'Login with valid email and password', type: 'Positive', priority: 'High', status: 'Positive' },
    { id: 'TC-002', name: 'Login with valid email and empty password', type: 'Negative', priority: 'High', status: 'Negative' },
    { id: 'TC-003', name: 'Login with invalid email format', type: 'Negative', priority: 'Medium', status: 'Negative' },
    { id: 'TC-004', name: 'Login with invalid password', type: 'Negative', priority: 'High', status: 'Negative' },
    { id: 'TC-005', name: 'Login with locked account', type: 'Negative', priority: 'High', status: 'Negative' },
    { id: 'TC-006', name: 'Login with valid credentials and verify token', type: 'Positive', priority: 'High', status: 'Positive' },
    { id: 'TC-007', name: 'Verify 401 response for invalid password', type: 'Negative', priority: 'High', status: 'Negative' },
    { id: 'TC-008', name: 'Verify 423 response for locked account', type: 'Negative', priority: 'High', status: 'Negative' },
  ]);
  const [suite, setSuite] = React.useState<Suite>({
    name: 'Login Feature Test Suite',
    description: 'Test suite for user login functionality including positive, negative and security scenarios.',
  });
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleAddCriteria = () => {
    if (newCriteria.trim()) {
      setCriteria([...criteria, { id: Date.now().toString(), text: newCriteria }]);
      setNewCriteria('');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Positive':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'Negative':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'Boundary':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Create Test Cases from Acceptance Criteria</h1>
          <p className='mt-1 text-sm text-text-secondary'>Provide Acceptance Criteria and let AI generate comprehensive test cases.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline'>
            <Upload className='mr-2 h-4 w-4' />
            Import from Jira / File
          </Button>
          <Button>
            <Sparkles className='mr-2 h-4 w-4' />
            Generate Test Cases
          </Button>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Acceptance Criteria */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base'>Acceptance Criteria</CardTitle>
              <Button variant='ghost' size='sm'>
                <Upload className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Rich Text Editor Toolbar */}
            <div className='mb-2 flex gap-1 border-b border-border pb-2'>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>B</Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>I</Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>U</Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <div className='flex flex-col gap-0.5'>
                  <div className='h-0.5 w-3 bg-current'></div>
                  <div className='h-0.5 w-3 bg-current'></div>
                </div>
              </Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <div className='flex flex-col gap-0.5'>
                  <div className='h-0.5 w-3 bg-current'></div>
                  <div className='h-0.5 w-3 bg-current'></div>
                  <div className='h-0.5 w-3 bg-current'></div>
                </div>
              </Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <ChevronDown className='h-4 w-4' />
              </Button>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0 ml-auto'>
                <div className='h-4 w-4 border-2 border-current rounded-full'></div>
              </Button>
            </div>

            {/* Criteria List */}
            <div className='space-y-3'>
              {criteria.map((item) => (
                <div key={item.id} className='text-sm text-text'>
                  {item.text}
                </div>
              ))}
            </div>

            {/* Add New Criteria */}
            <div className='mt-4'>
              <textarea
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder='Add new acceptance criteria...'
                className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary'
                rows={3}
              />
              <Button 
                variant='outline' 
                size='sm' 
                className='mt-2'
                onClick={handleAddCriteria}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add AC Item
              </Button>
            </div>

            <div className='mt-4 flex items-center justify-between text-xs text-text-secondary'>
              <span>6 / 100</span>
              <span>234 characters</span>
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Generated Test Cases */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base'>AI Generated Test Cases (Preview)</CardTitle>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-text-secondary'>28 Test Cases</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className='mb-4 space-y-2'>
              <SearchBar value={search} onChange={setSearch} placeholder='Search test cases...' className='w-full' />
              <div className='flex gap-2'>
                <select className='rounded-lg border border-border bg-background px-2 py-1 text-xs text-text'>
                  <option>All Types</option>
                  <option>Positive</option>
                  <option>Negative</option>
                  <option>Boundary</option>
                </select>
                <select className='rounded-lg border border-border bg-background px-2 py-1 text-xs text-text'>
                  <option>All Priority</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            {/* Test Cases Table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-xs text-text-secondary'>
                    <th className='px-2 py-2 font-medium'>Test Case</th>
                    <th className='px-2 py-2 font-medium'>Type</th>
                    <th className='px-2 py-2 font-medium'>Priority</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {generatedTestCases.slice(0, 8).map((tc) => (
                    <tr key={tc.id} className='hover:bg-surface transition-colors'>
                      <td className='px-2 py-2'>
                        <div className='text-xs font-mono text-text'>{tc.id}</div>
                        <div className='text-xs text-text-secondary line-clamp-1'>{tc.name}</div>
                      </td>
                      <td className='px-2 py-2'>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tc.status)}`}>
                          {tc.status}
                        </span>
                      </td>
                      <td className='px-2 py-2'>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(tc.priority)}`}>
                          {tc.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='mt-4 flex items-center justify-between'>
              <span className='text-xs text-text-secondary'>Showing 1 to 8 of 28 test cases</span>
              <div className='flex gap-1'>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0' disabled>‹</Button>
                <Button variant='default' size='sm' className='h-7 w-7 p-0'>1</Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0'>2</Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0'>3</Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0'>4</Button>
                <Button variant='outline' size='sm' className='h-7 w-7 p-0'>›</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Generation Settings */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle className='text-base'>Generation Settings</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Target API */}
            <div>
              <label className='text-sm font-medium text-text mb-2 block'>Target API *</label>
              <input 
                type='text' 
                value={targetApi}
                onChange={(e) => setTargetApi(e.target.value)}
                className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
              />
            </div>

            {/* Environment */}
            <div>
              <label className='text-sm font-medium text-text mb-2 block'>Environment *</label>
              <select 
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
              >
                <option>DEV (https://dev.api.company.com)</option>
                <option>TEST (https://test.api.company.com)</option>
                <option>STAGE (https://stage.api.company.com)</option>
                <option>PROD (https://api.company.com)</option>
              </select>
            </div>

            {/* Test Case Type */}
            <div>
              <label className='text-sm font-medium text-text mb-2 block'>Test Case Type</label>
              <div className='space-y-2'>
                {[
                  { key: 'positive', label: 'Positive' },
                  { key: 'negative', label: 'Negative' },
                  { key: 'boundary', label: 'Boundary' },
                  { key: 'security', label: 'Security' },
                  { key: 'performance', label: 'Performance' },
                ].map((type) => (
                  <label key={type.key} className='flex items-center gap-2 cursor-pointer'>
                    <input 
                      type='checkbox' 
                      checked={testCaseTypes[type.key as keyof typeof testCaseTypes]}
                      onChange={(e) => setTestCaseTypes({ ...testCaseTypes, [type.key]: e.target.checked })}
                      className='rounded border-border'
                    />
                    <span className='text-sm text-text'>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <label className='text-sm font-medium text-text mb-2 block'>Advanced Options</label>
              <div className='rounded-lg border border-border p-3'>
                <p className='text-xs text-text-secondary'>
                  AI will analyze your AC and generate comprehensive test cases including edge cases and validations.
                </p>
              </div>
            </div>

            {/* Create Suite */}
            <div className='pt-4 border-t border-border'>
              <label className='text-sm font-medium text-text mb-2 block'>Create Suite</label>
              <div className='space-y-2'>
                <input 
                  type='text' 
                  value={suite.name}
                  onChange={(e) => setSuite({ ...suite, name: e.target.value })}
                  placeholder='Suite Name *'
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
                <textarea
                  value={suite.description}
                  onChange={(e) => setSuite({ ...suite, description: e.target.value })}
                  placeholder='Suite Description'
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  rows={3}
                />
              </div>
              <Button className='w-full mt-4'>
                <Play className='mr-2 h-4 w-4' />
                Create Suite with 28 Test Cases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequirementsPage;