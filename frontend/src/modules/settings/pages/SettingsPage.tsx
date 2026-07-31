// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Switch } from '../../../components/forms/Switch';
import { Separator } from '../../../components/ui/Separator';
import { User, Bell, Shield, Palette, Globe, Key, Server, Database, Link2, FileText, ChevronRight } from 'lucide-react';

// Styles

export interface SettingsPageProps {}

interface ProjectSettings {
  projectName: string;
  projectDescription: string;
  timeZone: string;
  defaultLanguage: string;
}

interface DefaultPreferences {
  defaultEnvironment: string;
  defaultSuiteStatus: string;
  defaultTestCaseType: string;
  defaultView: string;
  itemsPerPage: number;
}

interface TestCaseDefaults {
  defaultPriority: string;
  defaultSeverity: string;
  autoGenerateTestData: boolean;
  includeExampleInTestSteps: boolean;
  captureResponseByDefault: boolean;
}

interface ApiSettings {
  followRedirects: boolean;
  validateSslCertificates: boolean;
  allowInsecureRequests: boolean;
  maxRequestTimeout: number;
  retryFailedRequests: boolean;
}

interface DataStorageSettings {
  dataRetention: number;
  autoCleanupEnabled: boolean;
  attachmentStorageLimit: number;
  exportDataFormat: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [activeTab, setActiveTab] = React.useState('general');

  const [projectSettings, setProjectSettings] = React.useState<ProjectSettings>({
    projectName: 'Banking API',
    projectDescription: 'API validation project for banking platform services',
    timeZone: '(UTC+05:30) Asia/Kolkata',
    defaultLanguage: 'English',
  });

  const [defaultPreferences, setDefaultPreferences] = React.useState<DefaultPreferences>({
    defaultEnvironment: 'DEV (https://dev.api.company.com)',
    defaultSuiteStatus: 'Active',
    defaultTestCaseType: 'Positive',
    defaultView: 'Table',
    itemsPerPage: 10,
  });

  const [testCaseDefaults, setTestCaseDefaults] = React.useState<TestCaseDefaults>({
    defaultPriority: 'Medium',
    defaultSeverity: 'Major',
    autoGenerateTestData: true,
    includeExampleInTestSteps: true,
    captureResponseByDefault: true,
  });

  const [apiSettings, setApiSettings] = React.useState<ApiSettings>({
    followRedirects: true,
    validateSslCertificates: true,
    allowInsecureRequests: false,
    maxRequestTimeout: 60,
    retryFailedRequests: false,
  });

  const [dataStorage, setDataStorage] = React.useState<DataStorageSettings>({
    dataRetention: 90,
    autoCleanupEnabled: true,
    attachmentStorageLimit: 500,
    exportDataFormat: 'JSON',
  });

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Users & Roles' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'ai', label: 'AI & Generation' },
    { id: 'execution', label: 'Execution' },
    { id: 'storage', label: 'Data & Storage' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'audit', label: 'Audit Logs' },
  ];

  const quickLinks = [
    { name: 'Manage Environments', icon: Globe, href: '/environments' },
    { name: 'Manage Users & Roles', icon: User, href: '/settings' },
    { name: 'API Integrations', icon: Link2, href: '/settings' },
    { name: 'System Configuration', icon: Server, href: '/settings' },
    { name: 'Audit Logs', icon: FileText, href: '/settings' },
  ];

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-text'>Settings</h1>
        <p className='mt-1 text-sm text-text-secondary'>Manage your project settings and platform preferences.</p>
      </div>

      {/* Tabs */}
      <div className='mb-6 border-b border-border'>
        <div className='flex gap-1 overflow-x-auto'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Column - Settings Forms */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Project Settings */}
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Globe className='h-5 w-5 text-blue-600' />
                <CardTitle className='text-base'>Project Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Project Name</label>
                <input 
                  type='text' 
                  value={projectSettings.projectName}
                  onChange={(e) => setProjectSettings({ ...projectSettings, projectName: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Project Description</label>
                <textarea
                  value={projectSettings.projectDescription}
                  onChange={(e) => setProjectSettings({ ...projectSettings, projectDescription: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  rows={3}
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Time Zone</label>
                <select 
                  value={projectSettings.timeZone}
                  onChange={(e) => setProjectSettings({ ...projectSettings, timeZone: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>(UTC+05:30) Asia/Kolkata</option>
                  <option>(UTC-05:00) Eastern Time</option>
                  <option>(UTC+00:00) UTC</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Language</label>
                <select 
                  value={projectSettings.defaultLanguage}
                  onChange={(e) => setProjectSettings({ ...projectSettings, defaultLanguage: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Default Preferences */}
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Palette className='h-5 w-5 text-purple-600' />
                <CardTitle className='text-base'>Default Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Environment</label>
                <select 
                  value={defaultPreferences.defaultEnvironment}
                  onChange={(e) => setDefaultPreferences({ ...defaultPreferences, defaultEnvironment: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>DEV (https://dev.api.company.com)</option>
                  <option>TEST (https://test.api.company.com)</option>
                  <option>STAGE (https://stage.api.company.com)</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Suite Status</label>
                <select 
                  value={defaultPreferences.defaultSuiteStatus}
                  onChange={(e) => setDefaultPreferences({ ...defaultPreferences, defaultSuiteStatus: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Draft</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Test Case Type</label>
                <select 
                  value={defaultPreferences.defaultTestCaseType}
                  onChange={(e) => setDefaultPreferences({ ...defaultPreferences, defaultTestCaseType: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>Positive</option>
                  <option>Negative</option>
                  <option>Boundary</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default View</label>
                <div className='flex gap-2'>
                  <Button variant={defaultPreferences.defaultView === 'Table' ? 'default' : 'outline'} size='sm' onClick={() => setDefaultPreferences({ ...defaultPreferences, defaultView: 'Table' })}>Table</Button>
                  <Button variant={defaultPreferences.defaultView === 'Compact' ? 'default' : 'outline'} size='sm' onClick={() => setDefaultPreferences({ ...defaultPreferences, defaultView: 'Compact' })}>Compact</Button>
                </div>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Items Per Page</label>
                <input 
                  type='number' 
                  value={defaultPreferences.itemsPerPage}
                  onChange={(e) => setDefaultPreferences({ ...defaultPreferences, itemsPerPage: parseInt(e.target.value) })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>

          {/* Test Case Defaults */}
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <FileText className='h-5 w-5 text-green-600' />
                <CardTitle className='text-base'>Test Case Defaults</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Priority</label>
                <select 
                  value={testCaseDefaults.defaultPriority}
                  onChange={(e) => setTestCaseDefaults({ ...testCaseDefaults, defaultPriority: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Default Severity</label>
                <select 
                  value={testCaseDefaults.defaultSeverity}
                  onChange={(e) => setTestCaseDefaults({ ...testCaseDefaults, defaultSeverity: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>Minor</option>
                  <option>Major</option>
                  <option>Critical</option>
                </select>
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Auto Generate Test Data</p>
                  <p className='text-xs text-text-secondary'>Automatically generate test data for new test cases</p>
                </div>
                <Switch checked={testCaseDefaults.autoGenerateTestData} onChange={() => setTestCaseDefaults({ ...testCaseDefaults, autoGenerateTestData: !testCaseDefaults.autoGenerateTestData })} />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Include Example In Test Steps</p>
                  <p className='text-xs text-text-secondary'>Add example values to test step descriptions</p>
                </div>
                <Switch checked={testCaseDefaults.includeExampleInTestSteps} onChange={() => setTestCaseDefaults({ ...testCaseDefaults, includeExampleInTestSteps: !testCaseDefaults.includeExampleInTestSteps })} />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Capture Response by Default</p>
                  <p className='text-xs text-text-secondary'>Automatically capture API responses</p>
                </div>
                <Switch checked={testCaseDefaults.captureResponseByDefault} onChange={() => setTestCaseDefaults({ ...testCaseDefaults, captureResponseByDefault: !testCaseDefaults.captureResponseByDefault })} />
              </div>
              <Button>Save Defaults</Button>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Server className='h-5 w-5 text-orange-600' />
                <CardTitle className='text-base'>API Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Follow Redirects</p>
                  <p className='text-xs text-text-secondary'>Automatically follow HTTP redirects</p>
                </div>
                <Switch checked={apiSettings.followRedirects} onChange={() => setApiSettings({ ...apiSettings, followRedirects: !apiSettings.followRedirects })} />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Validate SSL Certificates</p>
                  <p className='text-xs text-text-secondary'>Verify SSL certificates for HTTPS requests</p>
                </div>
                <Switch checked={apiSettings.validateSslCertificates} onChange={() => setApiSettings({ ...apiSettings, validateSslCertificates: !apiSettings.validateSslCertificates })} />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Allow Insecure Requests (HTTP)</p>
                  <p className='text-xs text-text-secondary'>Permit requests to non-HTTPS endpoints</p>
                </div>
                <Switch checked={apiSettings.allowInsecureRequests} onChange={() => setApiSettings({ ...apiSettings, allowInsecureRequests: !apiSettings.allowInsecureRequests })} />
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Max Request Timeout (seconds)</label>
                <input 
                  type='number' 
                  value={apiSettings.maxRequestTimeout}
                  onChange={(e) => setApiSettings({ ...apiSettings, maxRequestTimeout: parseInt(e.target.value) })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Retry Failed Requests</p>
                  <p className='text-xs text-text-secondary'>Automatically retry failed API requests</p>
                </div>
                <Switch checked={apiSettings.retryFailedRequests} onChange={() => setApiSettings({ ...apiSettings, retryFailedRequests: !apiSettings.retryFailedRequests })} />
              </div>
            </CardContent>
          </Card>

          {/* Data & Storage */}
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Database className='h-5 w-5 text-cyan-600' />
                <CardTitle className='text-base'>Data & Storage</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Data Retention (Days)</label>
                <input 
                  type='number' 
                  value={dataStorage.dataRetention}
                  onChange={(e) => setDataStorage({ ...dataStorage, dataRetention: parseInt(e.target.value) })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-text'>Auto Cleanup Enabled</p>
                  <p className='text-xs text-text-secondary'>Automatically delete old execution data</p>
                </div>
                <Switch checked={dataStorage.autoCleanupEnabled} onChange={() => setDataStorage({ ...dataStorage, autoCleanupEnabled: !dataStorage.autoCleanupEnabled })} />
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Attachment Storage Limit (MB)</label>
                <input 
                  type='number' 
                  value={dataStorage.attachmentStorageLimit}
                  onChange={(e) => setDataStorage({ ...dataStorage, attachmentStorageLimit: parseInt(e.target.value) })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text mb-2 block'>Export Data Format</label>
                <select 
                  value={dataStorage.exportDataFormat}
                  onChange={(e) => setDataStorage({ ...dataStorage, exportDataFormat: e.target.value })}
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                >
                  <option>JSON</option>
                  <option>XML</option>
                  <option>CSV</option>
                  <option>PDF</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Links */}
        <Card className='lg:col-span-1 h-fit'>
          <CardHeader>
            <CardTitle className='text-base'>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className='flex items-center justify-between rounded-lg border border-border p-3 hover:bg-surface transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <Icon className='h-4 w-4 text-text-secondary' />
                      <span className='text-sm font-medium text-text'>{link.name}</span>
                    </div>
                    <ChevronRight className='h-4 w-4 text-text-secondary' />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;