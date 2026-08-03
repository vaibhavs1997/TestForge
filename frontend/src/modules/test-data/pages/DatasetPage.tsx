// Test Data Library - Production Quality UI
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Copy,
  LayoutGrid,
  Table,
  ChevronRight,
  Sparkles,
  Globe,
  Zap,
  Network,
  FileText,
  FlaskConical,
  BookOpen,
  Keyboard,
  FileUp,
  Wand2,
} from 'lucide-react';
import { DatasetDialog, type DatasetDialogData } from '../components/DatasetDialog';
import { ColumnProfileDialog, type ColumnProfileData } from '../components/ColumnProfileDialog';
import { DataTabContent } from '../components/DataTabContent';
import { RelationshipDialog } from '../components/RelationshipDialog';
import { ProvidersSection } from '../components/ProvidersSection';
import type { ColumnSuggestion } from '../services/columnService';
import { rowService } from '../services/rowService';
import { relationshipService } from '../services/relationshipService';
import { Check, X as XIcon, ArrowUp, ArrowDown, Plus as PlusIcon, Upload, FileSpreadsheet, FileJson } from 'lucide-react';

// Types
interface Dataset {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  rows: number;
  columns: number;
  relationships: number;
  lastUpdated: string;
  created: string;
  usedBy: {
    requirements: number;
    suites: number;
    apis: number;
    knowledge: number;
  };
}

type ViewMode = 'card' | 'table';
type NavSection = 'datasets' | 'datasources' | 'generators' | 'providers' | 'relationships';

// Mock Data
const MOCK_DATASETS: Dataset[] = [
  {
    id: '1',
    projectId: '1',
    name: 'Users',
    description: 'User accounts, profiles, and authentication data',
    category: 'User',
    rows: 15420,
    columns: 24,
    relationships: 3,
    lastUpdated: '2 hours ago',
    created: '2024-01-15',
    usedBy: { requirements: 12, suites: 8, apis: 5, knowledge: 3 },
  },
  {
    id: '2',
    projectId: '1',
    name: 'Customers',
    description: 'Customer information and contact details',
    category: 'Customer',
    rows: 8930,
    columns: 18,
    relationships: 2,
    lastUpdated: '5 hours ago',
    created: '2024-01-10',
    usedBy: { requirements: 8, suites: 5, apis: 3, knowledge: 2 },
  },
  {
    id: '3',
    projectId: '1',
    name: 'Products',
    description: 'Product catalog with pricing and inventory',
    category: 'Product',
    rows: 3420,
    columns: 32,
    relationships: 4,
    lastUpdated: '1 day ago',
    created: '2024-01-08',
    usedBy: { requirements: 15, suites: 10, apis: 7, knowledge: 4 },
  },
  {
    id: '4',
    projectId: '1',
    name: 'Orders',
    description: 'Customer orders and transaction history',
    category: 'Order',
    rows: 45680,
    columns: 28,
    relationships: 5,
    lastUpdated: '3 days ago',
    created: '2024-01-05',
    usedBy: { requirements: 20, suites: 12, apis: 8, knowledge: 5 },
  },
  {
    id: '5',
    projectId: '1',
    name: 'Payments',
    description: 'Payment methods and transaction records',
    category: 'Payment',
    rows: 28950,
    columns: 22,
    relationships: 3,
    lastUpdated: '1 week ago',
    created: '2024-01-01',
    usedBy: { requirements: 10, suites: 6, apis: 4, knowledge: 2 },
  },
];

const CATEGORY_OPTIONS = ['General', 'Customer', 'Product', 'Order', 'Payment', 'User', 'Custom'];

export const TestDataLibraryPage = () => {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [activeNav, setActiveNav] = React.useState<NavSection>('datasets');
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedDataset, setSelectedDataset] = React.useState<Dataset | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedColumn, setSelectedColumn] = React.useState<ColumnProfileData | undefined>(undefined);
  const [structureSearch, setStructureSearch] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [rejectedSuggestions, setRejectedSuggestions] = React.useState<Set<string>>(new Set());
  const [selectedSuggestionIds, setSelectedSuggestionIds] = React.useState<Set<string>>(new Set());
  const [importWizardOpen, setImportWizardOpen] = React.useState(false);
  const [importStep, setImportStep] = React.useState(1);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importPreview, setImportPreview] = React.useState<Record<string, any>[]>([]);
  const [importColumns, setImportColumns] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({});
  const [importOptions, setImportOptions] = React.useState({
    mode: 'append' as 'append' | 'replace' | 'skipDuplicates',
    onError: 'stop' as 'stop' | 'continue',
    skipEmptyRows: true,
  });
  const [importResult, setImportResult] = React.useState<any>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [relationshipDialogOpen, setRelationshipDialogOpen] = React.useState(false);
  const [relationships, setRelationships] = React.useState<any[]>([]);

  // Mock CRUD operations
  const [datasets, setDatasets] = React.useState<Dataset[]>(MOCK_DATASETS);

  const filteredDatasets = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return datasets.filter((dataset) => {
      const matchesSearch = dataset.name.toLowerCase().includes(term) || dataset.description.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'All' || dataset.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter, datasets]);

  const handleCreate = (data: DatasetDialogData) => {
    const newDataset: Dataset = {
      id: Date.now().toString(),
      projectId: '1',
      name: data.name,
      description: data.description,
      category: data.category,
      rows: 0,
      columns: 0,
      relationships: 0,
      lastUpdated: 'Just now',
      created: new Date().toISOString().split('T')[0],
      usedBy: { requirements: 0, suites: 0, apis: 0, knowledge: 0 },
    };
    setDatasets([...datasets, newDataset]);
    setEditOpen(false);
    setToastMessage('Dataset created successfully');
    setToastOpen(true);
  };

  const handleUpdate = (data: DatasetDialogData) => {
    if (!selectedDataset) return;
    setDatasets(datasets.map((d) => (d.id === selectedDataset.id ? { ...d, ...data, lastUpdated: 'Just now' } : d)));
    setEditOpen(false);
    setToastMessage('Dataset updated successfully');
    setToastOpen(true);
  };

  const handleDelete = () => {
    if (!selectedDataset) return;
    setDatasets(datasets.filter((d) => d.id !== selectedDataset.id));
    setDeleteOpen(false);
    setToastMessage('Dataset deleted successfully');
    setToastOpen(true);
  };

  const handleDuplicate = (dataset: Dataset) => {
    const duplicate: Dataset = {
      ...dataset,
      id: Date.now().toString(),
      projectId: dataset.projectId,
      name: `${dataset.name} Copy`,
      lastUpdated: 'Just now',
      usedBy: { requirements: 0, suites: 0, apis: 0, knowledge: 0 },
    };
    setDatasets([...datasets, duplicate]);
    setToastMessage('Dataset duplicated successfully');
    setToastOpen(true);
  };

  const openDatasetDetails = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setDetailsOpen(true);
    setActiveTab('Overview');
    setShowSuggestions(false);
    setRejectedSuggestions(new Set());
    setSelectedSuggestionIds(new Set());
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      General: 'default',
      Customer: 'secondary',
      Product: 'outline',
      Order: 'default',
      Payment: 'destructive',
      User: 'secondary',
      Custom: 'outline',
    };
    return <Badge variant={variants[category] || 'outline'}>{category}</Badge>;
  };

  const resetImportWizard = () => {
    setImportStep(1);
    setImportFile(null);
    setImportPreview([]);
    setImportColumns([]);
    setColumnMapping({});
    setImportOptions({
      mode: 'append',
      onError: 'stop',
      skipEmptyRows: true,
    });
    setImportResult(null);
    setIsImporting(false);
  };

  const handleFileSelect = (file: File | null) => {
    setImportFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (file.name.endsWith('.json')) {
          try {
            const json = JSON.parse(content);
            if (Array.isArray(json) && json.length > 0) {
              const columns = Object.keys(json[0]);
              setImportColumns(columns);
              setImportPreview(json);
              setColumnMapping(columns.reduce((acc, col) => ({ ...acc, [col]: col }), {}));
            }
          } catch (err) {
            setToastMessage('Invalid JSON file');
            setToastOpen(true);
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r?\n/).filter(line => line.trim());
          if (lines.length > 0) {
            const columns = lines[0].split(',').map(c => c.trim());
            setImportColumns(columns);
            const data: Record<string, any>[] = [];
            for (let i = 1; i < Math.min(lines.length, 21); i++) {
              const values = lines[i].split(',');
              const row: Record<string, any> = {};
              columns.forEach((col, idx) => {
                row[col] = values[idx]?.trim() || '';
              });
              data.push(row);
            }
            setImportPreview(data);
            setColumnMapping(columns.reduce((acc, col) => ({ ...acc, [col]: col }), {}));
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleNextStep = async () => {
    if (importStep === 5) {
      // Execute import
      setIsImporting(true);
      try {
        const result = await rowService.importData(
          selectedDataset?.projectId || '1',
          selectedDataset?.id || '1',
          importFile!,
          importOptions
        );
        setImportResult(result);
      } catch (error) {
        setToastMessage('Import failed');
        setToastOpen(true);
      } finally {
        setIsImporting(false);
      }
    }
    setImportStep(importStep + 1);
  };

  const canProceed = () => {
    if (importStep === 1) return importFile !== null;
    if (importStep === 5) return true;
    return true;
  };

  // Navigation Items
  const navItems = [
    { id: 'datasets' as NavSection, label: 'Datasets', icon: Database, active: activeNav === 'datasets' },
    { id: 'datasources' as NavSection, label: 'Data Sources', icon: Globe, active: activeNav === 'datasources' },
    { id: 'generators' as NavSection, label: 'Generators', icon: Zap, active: activeNav === 'generators' },
    { id: 'providers' as NavSection, label: 'Providers', icon: Sparkles, active: activeNav === 'providers' },
    { id: 'relationships' as NavSection, label: 'Relationships', icon: Network, active: activeNav === 'relationships' },
  ];

  return (
    <div className='flex h-screen'>
      {/* Left Navigation Sidebar */}
      <div className='w-64 border-r border-border bg-surface'>
        <div className='p-4'>
          <h2 className='mb-4 text-sm font-semibold text-text-secondary'>Test Data Library</h2>
          <nav className='space-y-1'>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeNav === item.id ? 'bg-primary text-white' : 'text-text hover:bg-surface'
                }`}
              >
                <div className='flex items-center gap-2'>
                  <item.icon className='h-4 w-4' />
                  {item.label}
                </div>
                {!item.active && (
                  <Badge variant='secondary' className='text-xs'>
                    Soon
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 overflow-auto'>
        <div className='mx-auto max-w-7xl px-4 py-8'>
          {/* Relationships Section */}
          {activeNav === 'relationships' && (
            <RelationshipsSection
              datasets={datasets}
              projectId='1'
              setToastMessage={setToastMessage}
              setToastOpen={setToastOpen}
            />
          )}

          {/* Providers Section */}
          {activeNav === 'providers' && (
            <ProvidersSection
              projectId='1'
              setToastMessage={setToastMessage}
              setToastOpen={setToastOpen}
            />
          )}

          {/* Coming Soon Sections */}
          {activeNav !== 'datasets' && activeNav !== 'relationships' && activeNav !== 'providers' && (
            <div className='flex flex-col items-center justify-center py-20'>
              <div className='mb-4 rounded-full bg-primary/10 p-6'>
                {activeNav === 'datasources' && <Globe className='h-12 w-12 text-primary' />}
                {activeNav === 'generators' && <Zap className='h-12 w-12 text-primary' />}
              </div>
              <h3 className='mb-2 text-2xl font-bold text-text'>Coming Soon</h3>
              <p className='mb-6 max-w-md text-center text-sm text-text-secondary'>
                {activeNav === 'datasources' &&
                  'Manage where execution data comes from. Configure datasets, environment variables, runtime responses, and AI-generated data sources.'}
                {activeNav === 'generators' && 'Reusable value generators for creating realistic test data on the fly.'}
              </p>
              <Badge variant='outline' className='text-xs'>
                Available in next release
              </Badge>
            </div>
          )}

          {/* Datasets Section */}
          {activeNav === 'datasets' && (
            <>
              {/* Page Header */}
              <div className='mb-6 flex items-center justify-between'>
                <div>
                  <h1 className='text-2xl font-bold text-text'>Test Data Library</h1>
                  <p className='mt-1 text-sm text-text-secondary'>
                    Manage reusable datasets, generators, providers and data mappings used across your project.
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' onClick={() => setImportWizardOpen(true)}>
                    <Upload className='mr-2 h-4 w-4' />
                    Import Dataset
                  </Button>
                  <Button onClick={() => { setSelectedDataset(null); setEditOpen(true); }}>
                    <Plus className='mr-2 h-4 w-4' />
                    New Dataset
                  </Button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex flex-1 items-center gap-3'>
                  <SearchBar value={search} onChange={setSearch} placeholder='Search datasets...' className='sm:w-80' />
                  <div className='flex gap-2'>
                    {CATEGORY_OPTIONS.map((category) => (
                      <Button
                        key={category}
                        variant={categoryFilter === category ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCategoryFilter(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setViewMode('card')}
                  >
                    <LayoutGrid className='h-4 w-4' />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setViewMode('table')}
                  >
                    <Table className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              {/* Empty State */}
              {filteredDatasets.length === 0 && (
                <EmptyState
                  icon={<Database className='h-12 w-12' />}
                  title='No datasets available'
                  description='Create your first reusable dataset to get started.'
                  action={{ label: 'Create Dataset', onClick: () => setEditOpen(true) }}
                />
              )}

              {/* Card View */}
              {viewMode === 'card' && filteredDatasets.length > 0 && (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  {filteredDatasets.map((dataset) => (
                    <Card key={dataset.id} className='transition-shadow hover:shadow-lg'>
                      <CardHeader>
                        <div className='flex items-start justify-between'>
                          <div className='flex items-center gap-2'>
                            <Database className='h-5 w-5 text-primary' />
                            <div>
                              <CardTitle className='text-base'>{dataset.name}</CardTitle>
                              <div className='mt-1'>{getCategoryBadge(dataset.category)}</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-3'>
                          <div>
                            <p className='text-xs font-medium text-text-secondary'>Description</p>
                            <p className='text-xs text-text'>{dataset.description}</p>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-text-secondary'>Rows</span>
                            <span className='font-medium text-text'>{dataset.rows.toLocaleString()}</span>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-text-secondary'>Columns</span>
                            <span className='font-medium text-text'>{dataset.columns}</span>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-text-secondary'>Relationships</span>
                            <span className='font-medium text-text'>{dataset.relationships}</span>
                          </div>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-text-secondary'>Last Updated</span>
                            <span className='font-medium text-text'>{dataset.lastUpdated}</span>
                          </div>
                          <div className='flex gap-2 pt-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex-1'
                              onClick={() => openDatasetDetails(dataset)}
                            >
                              View
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex-1'
                              onClick={() => { setSelectedDataset(dataset); setEditOpen(true); }}
                            >
                              <Edit className='mr-1 h-3 w-3' />
                              Edit
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => handleDuplicate(dataset)}>
                              <Copy className='h-3 w-3' />
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => { setSelectedDataset(dataset); setDeleteOpen(true); }}>
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && filteredDatasets.length > 0 && (
                <Card>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead className='border-b border-border bg-surface'>
                        <tr>
                          <th className='px-4 py-3 text-left'>Name</th>
                          <th className='px-4 py-3 text-left'>Category</th>
                          <th className='px-4 py-3 text-left'>Rows</th>
                          <th className='px-4 py-3 text-left'>Columns</th>
                          <th className='px-4 py-3 text-left'>Relationships</th>
                          <th className='px-4 py-3 text-left'>Last Updated</th>
                          <th className='px-4 py-3 text-right'>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDatasets.map((dataset) => (
                          <tr key={dataset.id} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                            <td className='px-4 py-3 font-medium'>{dataset.name}</td>
                            <td className='px-4 py-3'>{getCategoryBadge(dataset.category)}</td>
                            <td className='px-4 py-3'>{dataset.rows.toLocaleString()}</td>
                            <td className='px-4 py-3'>{dataset.columns}</td>
                            <td className='px-4 py-3'>{dataset.relationships}</td>
                            <td className='px-4 py-3 text-text-secondary'>{dataset.lastUpdated}</td>
                            <td className='px-4 py-3'>
                              <div className='flex items-center justify-end gap-1'>
                                <Button variant='ghost' size='sm' onClick={() => openDatasetDetails(dataset)}>
                                  <ChevronRight className='h-4 w-4' />
                                </Button>
                                <Button variant='ghost' size='sm' onClick={() => { setSelectedDataset(dataset); setEditOpen(true); }}>
                                  <Edit className='h-4 w-4' />
                                </Button>
                                <Button variant='ghost' size='sm' onClick={() => handleDuplicate(dataset)}>
                                  <Copy className='h-3 w-3' />
                                </Button>
                                <Button variant='ghost' size='sm' onClick={() => { setSelectedDataset(dataset); setDeleteOpen(true); }}>
                                  <Trash2 className='h-3 w-3' />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Dataset Details Panel */}
              {detailsOpen && selectedDataset && (
                <div className='fixed inset-0 z-50 flex'>
                  <div className='flex-1 bg-black/50' onClick={() => setDetailsOpen(false)} />
                  <div className='w-2/3 max-w-3xl border-l border-border bg-background p-8 overflow-auto'>
                    <div className='mb-6 flex items-center justify-between'>
                      <h2 className='text-2xl font-bold text-text'>{selectedDataset.name}</h2>
                      <Button variant='ghost' size='sm' onClick={() => setDetailsOpen(false)}>
                        ✕
                      </Button>
                    </div>

                    {/* Tabs */}
                    <div className='mb-6 border-b border-border'>
                      <div className='flex gap-4'>
                        {['Overview', 'Structure', 'Data', 'Relationships', 'Mappings'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`border-b-2 px-4 py-2 text-sm font-medium ${
                              activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-secondary hover:text-text'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Overview Tab Content */}
                    {activeTab === 'Overview' && (
                      <div className='space-y-6'>
                        <Card>
                          <CardHeader>
                            <CardTitle>Dataset Information</CardTitle>
                          </CardHeader>
                          <CardContent className='space-y-4'>
                            <div>
                              <p className='text-xs font-medium text-text-secondary'>Name</p>
                              <p className='text-sm text-text'>{selectedDataset.name}</p>
                            </div>
                            <div>
                              <p className='text-xs font-medium text-text-secondary'>Description</p>
                              <p className='text-sm text-text'>{selectedDataset.description}</p>
                            </div>
                            <div>
                              <p className='text-xs font-medium text-text-secondary'>Category</p>
                              {getCategoryBadge(selectedDataset.category)}
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                              <div>
                                <p className='text-xs font-medium text-text-secondary'>Rows</p>
                                <p className='text-sm text-text'>{selectedDataset.rows.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-text-secondary'>Columns</p>
                                <p className='text-sm text-text'>{selectedDataset.columns}</p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-text-secondary'>Relationships</p>
                                <p className='text-sm text-text'>{selectedDataset.relationships}</p>
                              </div>
                              <div>
                                <p className='text-xs font-medium text-text-secondary'>Created</p>
                                <p className='text-sm text-text'>{selectedDataset.created}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Used By</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='grid grid-cols-2 gap-4'>
                              <div className='flex items-center gap-2'>
                                <FileText className='h-4 w-4 text-text-secondary' />
                                <div>
                                  <p className='text-xs font-medium text-text-secondary'>Requirements</p>
                                  <p className='text-sm font-medium text-text'>{selectedDataset.usedBy.requirements}</p>
                                </div>
                              </div>
                              <div className='flex items-center gap-2'>
                                <FlaskConical className='h-4 w-4 text-text-secondary' />
                                <div>
                                  <p className='text-xs font-medium text-text-secondary'>Test Suites</p>
                                  <p className='text-sm font-medium text-text'>{selectedDataset.usedBy.suites}</p>
                                </div>
                              </div>
                              <div className='flex items-center gap-2'>
                                <Globe className='h-4 w-4 text-text-secondary' />
                                <div>
                                  <p className='text-xs font-medium text-text-secondary'>APIs</p>
                                  <p className='text-sm font-medium text-text'>{selectedDataset.usedBy.apis}</p>
                                </div>
                              </div>
                              <div className='flex items-center gap-2'>
                                <BookOpen className='h-4 w-4 text-text-secondary' />
                                <div>
                                  <p className='text-xs font-medium text-text-secondary'>Knowledge</p>
                                  <p className='text-sm font-medium text-text'>{selectedDataset.usedBy.knowledge}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Structure Tab - Merged Columns + Population Profiles */}
                    {activeTab === 'Structure' && (
                      <StructureTabContent
                        dataset={selectedDataset}
                        structureSearch={structureSearch}
                        setStructureSearch={setStructureSearch}
                        showSuggestions={showSuggestions}
                        setShowSuggestions={setShowSuggestions}
                        rejectedSuggestions={rejectedSuggestions}
                        setRejectedSuggestions={setRejectedSuggestions}
                        selectedSuggestionIds={selectedSuggestionIds}
                        setSelectedSuggestionIds={setSelectedSuggestionIds}
                        editorOpen={editorOpen}
                        setEditorOpen={setEditorOpen}
                        selectedColumn={selectedColumn}
                        setSelectedColumn={setSelectedColumn}
                        setToastMessage={setToastMessage}
                        setToastOpen={setToastOpen}
                      />
                    )}

                    {/* Data Tab - Spreadsheet Row Editor */}
                    {activeTab === 'Data' && (
                      <DataTabContent
                        projectId={selectedDataset.projectId}
                        datasetId={selectedDataset.id}
                        columns={MOCK_STRUCTURE_COLUMNS.map((col) => ({
                          id: col.id,
                          datasetId: col.datasetId,
                          name: col.name,
                          displayName: col.displayName,
                          dataType: col.dataType,
                          required: col.required,
                          unique: col.unique,
                          nullable: col.nullable,
                          description: col.description,
                        }))}
                        setToastMessage={setToastMessage}
                        setToastOpen={setToastOpen}
                      />
                    )}

                    {/* Other Tabs - Empty States */}
                    {['Relationships', 'Mappings'].includes(activeTab) && (
                      <Card>
                        <CardContent className='flex flex-col items-center justify-center py-12'>
                          <Database className='mb-4 h-12 w-12 text-text-secondary' />
                          <p className='mb-2 text-sm font-medium text-text'>This feature will be available in the next implementation.</p>
                          <p className='text-xs text-text-secondary'>Check back soon for updates.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Import Wizard Modal */}
              {importWizardOpen && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
                  <Card className='w-full max-w-3xl max-h-[90vh] overflow-hidden'>
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <div>
                          <CardTitle>Import Dataset</CardTitle>
                          <p className='text-xs text-text-secondary mt-1'>
                            Step {importStep} of 5: {importStep === 1 ? 'Upload File' : importStep === 2 ? 'Preview Data' : importStep === 3 ? 'Column Mapping' : importStep === 4 ? 'Import Options' : 'Import Summary'}
                          </p>
                        </div>
                        <Button variant='ghost' size='sm' onClick={() => { setImportWizardOpen(false); resetImportWizard(); }}>
                          ✕
                        </Button>
                      </div>
                      {/* Progress Bar */}
                      <div className='mt-4 flex items-center gap-2'>
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div key={step} className='flex items-center gap-2 flex-1'>
                            <div className={`h-2 flex-1 rounded ${step <= importStep ? 'bg-primary' : 'bg-gray-200'}`} />
                            {step < 5 && <ChevronRight className='h-4 w-4 text-text-secondary' />}
                          </div>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className='overflow-y-auto max-h-[60vh]'>
                      {/* Step 1: Upload File */}
                      {importStep === 1 && (
                        <div className='space-y-4'>
                          <div className='border-2 border-dashed border-border rounded-lg p-8 text-center'>
                            <Upload className='h-12 w-12 mx-auto mb-4 text-text-secondary' />
                            <h3 className='text-sm font-medium text-text mb-2'>Upload File</h3>
                            <p className='text-xs text-text-secondary mb-4'>Supports CSV and JSON formats</p>
                            <input
                              type='file'
                              accept='.csv,.json'
                              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                              className='block mx-auto'
                            />
                            {importFile && (
                              <div className='mt-4 flex items-center justify-center gap-2'>
                                {importFile.name.endsWith('.csv') ? <FileSpreadsheet className='h-5 w-5' /> : <FileJson className='h-5 w-5' />}
                                <span className='text-sm font-medium'>{importFile.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Preview Data */}
                      {importStep === 2 && (
                        <div className='space-y-4'>
                          <h3 className='text-sm font-medium text-text'>Preview (First 20 rows)</h3>
                          <div className='overflow-x-auto border border-border rounded-lg'>
                            <table className='w-full text-xs'>
                              <thead className='bg-surface'>
                                <tr>
                                  {importColumns.map((col) => (
                                    <th key={col} className='px-3 py-2 text-left font-medium'>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className='divide-y divide-border'>
                                {importPreview.slice(0, 20).map((row, idx) => (
                                  <tr key={idx}>
                                    {importColumns.map((col) => (
                                      <td key={col} className='px-3 py-2'>{row[col]?.toString() || ''}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Column Mapping */}
                      {importStep === 3 && (
                        <div className='space-y-4'>
                          <h3 className='text-sm font-medium text-text'>Map Columns</h3>
                          <div className='space-y-2'>
                            {importColumns.map((col) => (
                              <div key={col} className='flex items-center gap-3 p-3 border border-border rounded-lg'>
                                <span className='text-sm font-medium flex-1'>{col}</span>
                                <ChevronRight className='h-4 w-4 text-text-secondary' />
                                <input
                                  type='text'
                                  value={columnMapping[col] || col}
                                  onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })}
                                  className='flex-1 rounded-lg border border-border px-3 py-1.5 text-sm'
                                  placeholder='Target column name'
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 4: Import Options */}
                      {importStep === 4 && (
                        <div className='space-y-4'>
                          <h3 className='text-sm font-medium text-text'>Import Options</h3>
                          <div className='space-y-3'>
                            <div>
                              <label className='text-xs font-medium text-text-secondary mb-1 block'>Import Mode</label>
                              <select
                                value={importOptions.mode}
                                onChange={(e) => setImportOptions({ ...importOptions, mode: e.target.value as any })}
                                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
                              >
                                <option value='append'>Append rows</option>
                                <option value='replace'>Replace all rows</option>
                                <option value='skipDuplicates'>Skip duplicates</option>
                              </select>
                            </div>
                            <div>
                              <label className='text-xs font-medium text-text-secondary mb-1 block'>On Error</label>
                              <select
                                value={importOptions.onError}
                                onChange={(e) => setImportOptions({ ...importOptions, onError: e.target.value as any })}
                                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
                              >
                                <option value='stop'>Stop on first error</option>
                                <option value='continue'>Continue on errors</option>
                              </select>
                            </div>
                            <div className='flex items-center gap-2'>
                              <input
                                type='checkbox'
                                id='skipEmpty'
                                checked={importOptions.skipEmptyRows}
                                onChange={(e) => setImportOptions({ ...importOptions, skipEmptyRows: e.target.checked })}
                                className='h-4 w-4 rounded border-border'
                              />
                              <label htmlFor='skipEmpty' className='text-sm text-text'>Skip empty rows</label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 5: Import Summary */}
                      {importStep === 5 && (
                        <div className='space-y-4'>
                          <h3 className='text-sm font-medium text-text'>Import Summary</h3>
                          {importResult ? (
                            <div className='space-y-3'>
                              <div className='grid grid-cols-2 gap-3'>
                                <Card>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs text-text-secondary'>Rows Imported</p>
                                    <p className='text-2xl font-bold text-green-600'>{importResult.rowsImported}</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs text-text-secondary'>Rows Failed</p>
                                    <p className='text-2xl font-bold text-red-600'>{importResult.rowsFailed}</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs text-text-secondary'>Rows Skipped</p>
                                    <p className='text-2xl font-bold text-yellow-600'>{importResult.rowsSkipped}</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs text-text-secondary'>Duplicates</p>
                                    <p className='text-2xl font-bold text-text'>{importResult.duplicatesSkipped}</p>
                                  </CardContent>
                                </Card>
                              </div>
                              {importResult.warnings.length > 0 && (
                                <Card className='border-yellow-200 bg-yellow-50'>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs font-medium text-yellow-800 mb-2'>Warnings</p>
                                    <ul className='space-y-1'>
                                      {importResult.warnings.map((w: string, idx: number) => (
                                        <li key={idx} className='text-xs text-yellow-700'>• {w}</li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              )}
                              {importResult.errors.length > 0 && (
                                <Card className='border-red-200 bg-red-50'>
                                  <CardContent className='pt-4'>
                                    <p className='text-xs font-medium text-red-800 mb-2'>Errors</p>
                                    <ul className='space-y-1'>
                                      {importResult.errors.map((e: string, idx: number) => (
                                        <li key={idx} className='text-xs text-red-700'>• {e}</li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              )}
                              <div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
                                <p className='text-sm font-medium text-green-800'>{importResult.message}</p>
                              </div>
                            </div>
                          ) : (
                            <p className='text-sm text-text-secondary'>Click "Import" to start the import process.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className='flex justify-between'>
                      <Button
                        variant='outline'
                        onClick={() => {
                          if (importStep === 1) {
                            setImportWizardOpen(false);
                            resetImportWizard();
                          } else {
                            setImportStep(importStep - 1);
                          }
                        }}
                      >
                        {importStep === 1 ? 'Cancel' : 'Back'}
                      </Button>
                      <Button
                        onClick={handleNextStep}
                        disabled={!canProceed()}
                      >
                        {importStep === 5 ? 'Finish' : 'Next'}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}

              {/* Unified Column + Population Editor */}
              <ColumnProfileDialog
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                onSubmit={(data) => {
                  setEditorOpen(false);
                  setToastMessage(selectedColumn ? 'Column updated successfully' : 'Column added successfully');
                  setToastOpen(true);
                }}
                column={selectedColumn}
                isSubmitting={false}
              />

              {/* Delete Confirmation */}
              <ConfirmDialog
                open={deleteOpen}
                title='Delete Dataset'
                message={`Deleting "${selectedDataset?.name}" cannot be undone.`}
                confirmLabel='Delete'
                cancelLabel='Cancel'
                variant='destructive'
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
              />

              {/* Toast */}
              <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Structure Tab Content ───────────────────────────────────────────────
interface StructureTabContentProps {
  dataset: Dataset;
  structureSearch: string;
  setStructureSearch: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  rejectedSuggestions: Set<string>;
  setRejectedSuggestions: (v: Set<string>) => void;
  selectedSuggestionIds: Set<string>;
  setSelectedSuggestionIds: (v: Set<string>) => void;
  editorOpen: boolean;
  setEditorOpen: (v: boolean) => void;
  selectedColumn: ColumnProfileData | undefined;
  setSelectedColumn: (v: ColumnProfileData | undefined) => void;
  setToastMessage: (v: string) => void;
  setToastOpen: (v: boolean) => void;
}

// Mock structure columns with population strategies merged in
const MOCK_STRUCTURE_COLUMNS: ColumnProfileData[] = [
  { id: '1', datasetId: '1', name: 'email', displayName: 'Email', dataType: 'Email', required: true, unique: true, nullable: false, description: 'User email address', strategyType: 'Existing Dataset', strategyConfig: { datasetId: '1', column: 'email' } },
  { id: '2', datasetId: '1', name: 'password', displayName: 'Password', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User password', strategyType: 'Existing Dataset', strategyConfig: { datasetId: '1', column: 'password' } },
  { id: '3', datasetId: '1', name: 'status', displayName: 'Status', dataType: 'Text', required: false, unique: false, nullable: true, description: 'Account status', strategyType: 'Static Value', strategyConfig: { value: 'Active' } },
  { id: '4', datasetId: '1', name: 'createdAt', displayName: 'Created At', dataType: 'Date', required: false, unique: false, nullable: false, description: 'Account creation date', strategyType: 'Generator', strategyConfig: { generator: 'Current Date' } },
];

// Mock AI suggestions - reuse the existing ColumnSuggestion type from columnService
const MOCK_SUGGESTIONS: ColumnSuggestion[] = [
  { name: 'email', displayName: 'Email', dataType: 'Email', required: true, unique: true, nullable: false, description: 'User email address', usedBy: ['POST /login', 'POST /register'] },
  { name: 'password', displayName: 'Password', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User password', usedBy: ['POST /login'] },
  { name: 'firstName', displayName: 'First Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User first name', usedBy: ['POST /register'] },
  { name: 'lastName', displayName: 'Last Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User last name', usedBy: ['POST /register'] },
  { name: 'phoneNumber', displayName: 'Phone Number', dataType: 'Phone', required: false, unique: false, nullable: true, description: 'User phone number', usedBy: ['POST /register'] },
];

const STRATEGY_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Manual': 'outline',
  'Static Value': 'default',
  'Existing Dataset': 'secondary',
  'Generator': 'default',
  'Provider': 'secondary',
  'Runtime Response': 'outline',
  'Environment Variable': 'destructive',
};

const getStrategyDisplay = (column: ColumnProfileData): string => {
  switch (column.strategyType) {
    case 'Static Value':
      return column.strategyConfig?.value || '—';
    case 'Existing Dataset': {
      const dsId = column.strategyConfig?.datasetId || '';
      const col = column.strategyConfig?.column || '';
      const dsName = dsId === '1' ? 'Users' : dsId === '2' ? 'Customers' : dsId === '3' ? 'Products' : dsId === '4' ? 'Orders' : dsId === '5' ? 'Payments' : dsId || '—';
      return `${dsName}.${col}`;
    }
    case 'Generator':
      return column.strategyConfig?.generator || '—';
    case 'Provider':
      return column.strategyConfig?.provider || '—';
    case 'Runtime Response':
      return column.strategyConfig?.operationId || '—';
    case 'Environment Variable':
      return column.strategyConfig?.environment || '—';
    default:
      return '—';
  }
};

const StructureTabContent: React.FC<StructureTabContentProps> = ({
  dataset,
  structureSearch,
  setStructureSearch,
  showSuggestions,
  setShowSuggestions,
  rejectedSuggestions,
  setRejectedSuggestions,
  selectedSuggestionIds,
  setSelectedSuggestionIds,
  editorOpen,
  setEditorOpen,
  selectedColumn,
  setSelectedColumn,
  setToastMessage,
  setToastOpen,
}) => {
  const [columns, setColumns] = React.useState<ColumnProfileData[]>(MOCK_STRUCTURE_COLUMNS);

  const filteredColumns = React.useMemo(() => {
    const term = structureSearch.trim().toLowerCase();
    return columns.filter((col) =>
      col.name.toLowerCase().includes(term) ||
      col.displayName.toLowerCase().includes(term) ||
      col.dataType.toLowerCase().includes(term) ||
      col.strategyType.toLowerCase().includes(term)
    );
  }, [structureSearch, columns]);

  const handleAddColumn = () => {
    setSelectedColumn(undefined);
    setEditorOpen(true);
  };

  const handleEditColumn = (col: ColumnProfileData) => {
    setSelectedColumn({
      ...col,
      datasetId: dataset.id,
    });
    setEditorOpen(true);
  };

  const handleDeleteColumn = (col: ColumnProfileData) => {
    setColumns(columns.filter((c) => c.id !== col.id));
    setToastMessage('Column deleted successfully');
    setToastOpen(true);
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...columns];
    if (direction === 'up' && index > 0) {
      [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
    } else if (direction === 'down' && index < newColumns.length - 1) {
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    }
    setColumns(newColumns);
  };

  const activeSuggestions = MOCK_SUGGESTIONS.filter((s) => !rejectedSuggestions.has(s.name));

  const handleAcceptAllSuggestions = () => {
    const toAdd = activeSuggestions
      .filter((s) => !columns.some((c) => c.name.toLowerCase() === s.name.toLowerCase()))
      .map((s) => ({
        id: Date.now().toString() + Math.random(),
        datasetId: dataset.id,
        name: s.name,
        displayName: s.displayName,
        dataType: s.dataType,
        required: s.required,
        unique: s.unique,
        nullable: s.nullable,
        description: s.description,
        strategyType: 'Manual' as const,
        strategyConfig: {},
      }));
    if (toAdd.length > 0) {
      setColumns([...columns, ...toAdd]);
    }
    setShowSuggestions(false);
    setSelectedSuggestionIds(new Set());
    setToastMessage(toAdd.length > 0 ? `${toAdd.length} columns added from suggestions` : 'All suggestions already added');
    setToastOpen(true);
  };

  const handleAcceptSelectedSuggestions = () => {
    const toAdd = activeSuggestions
      .filter((s) => selectedSuggestionIds.has(s.name) && !columns.some((c) => c.name.toLowerCase() === s.name.toLowerCase()))
      .map((s) => ({
        id: Date.now().toString() + Math.random(),
        datasetId: dataset.id,
        name: s.name,
        displayName: s.displayName,
        dataType: s.dataType,
        required: s.required,
        unique: s.unique,
        nullable: s.nullable,
        description: s.description,
        strategyType: 'Manual' as const,
        strategyConfig: {},
      }));
    if (toAdd.length > 0) {
      setColumns([...columns, ...toAdd]);
    }
    setShowSuggestions(false);
    setSelectedSuggestionIds(new Set());
    setToastMessage(toAdd.length > 0 ? `${toAdd.length} columns added from suggestions` : 'Select columns to add');
    setToastOpen(true);
  };

  const handleSkipSuggestions = () => {
    setRejectedSuggestions(new Set([...rejectedSuggestions, ...activeSuggestions.map((s) => s.name)]));
    setShowSuggestions(false);
    setSelectedSuggestionIds(new Set());
    setToastMessage('Suggestions skipped');
    setToastOpen(true);
  };

  const handleToggleSuggestion = (name: string) => {
    const next = new Set(selectedSuggestionIds);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedSuggestionIds(next);
  };

  const handleRejectSuggestion = (name: string) => {
    setRejectedSuggestions(new Set([...rejectedSuggestions, name]));
    const next = new Set(selectedSuggestionIds);
    next.delete(name);
    setSelectedSuggestionIds(next);
  };

  return (
    <div className='space-y-4'>
      {/* AI Recommendations Banner */}
      {!showSuggestions && activeSuggestions.length > 0 && (
        <Card className='border-primary/30 bg-primary/5'>
          <CardContent className='flex items-center justify-between py-4'>
            <div className='flex items-center gap-3'>
              <Sparkles className='h-5 w-5 text-primary' />
              <div>
                <p className='text-sm font-medium text-text'>✨ TestForge analyzed your imported API definitions.</p>
                <p className='text-xs text-text-secondary'>
                  {activeSuggestions.length} recommended columns based on your API operations
                </p>
              </div>
            </div>
            <Button size='sm' onClick={() => setShowSuggestions(true)}>
              View Recommendations
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Sparkles className='h-5 w-5 text-primary' />
                <div>
                  <CardTitle className='text-base'>Recommended Columns</CardTitle>
                  <p className='text-xs text-text-secondary'>✨ TestForge analyzed your imported API definitions.</p>
                </div>
              </div>
            </div>
            {activeSuggestions.length > 0 && (
              <div className='mt-3 flex items-center gap-2'>
                <Button size='sm' variant='default' onClick={handleAcceptAllSuggestions}>
                  <Check className='mr-1 h-4 w-4' />
                  Accept All
                </Button>
                <Button size='sm' variant='outline' onClick={handleAcceptSelectedSuggestions} disabled={selectedSuggestionIds.size === 0}>
                  Accept Selected ({selectedSuggestionIds.size})
                </Button>
                <Button size='sm' variant='ghost' onClick={handleSkipSuggestions}>
                  Skip
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className='space-y-3'>
            {activeSuggestions.map((suggestion) => {
              const isSelected = selectedSuggestionIds.has(suggestion.name);
              return (
                <div
                  key={suggestion.name}
                  className={`flex items-start justify-between rounded-lg border p-3 transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => handleToggleSuggestion(suggestion.name)}
                        className='h-4 w-4 rounded border-border'
                        aria-label={`Select ${suggestion.displayName}`}
                      />
                      <Check className='h-4 w-4 text-green-500' />
                      <span className='text-sm font-medium text-text'>{suggestion.displayName}</span>
                      <Badge variant='outline' className='text-xs'>{suggestion.dataType}</Badge>
                      {suggestion.required && <Badge variant='destructive' className='text-xs'>Required</Badge>}
                      {suggestion.unique && <Badge variant='secondary' className='text-xs'>Unique</Badge>}
                    </div>
                    <p className='mt-1 text-xs text-text-secondary'>{suggestion.description}</p>
                    <div className='mt-2'>
                      <p className='text-xs font-medium text-text-secondary'>Used by:</p>
                      <div className='mt-1 flex flex-wrap gap-1'>
                        {suggestion.usedBy.map((op) => (
                          <Badge key={op} variant='outline' className='text-xs font-mono'>{op}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRejectSuggestion(suggestion.name)}
                    className='ml-2'
                    aria-label={`Remove ${suggestion.displayName} suggestion`}
                  >
                    <XIcon className='h-4 w-4' />
                  </Button>
                </div>
              );
            })}
            {activeSuggestions.length === 0 && (
              <p className='py-4 text-center text-sm text-text-secondary'>All suggestions have been reviewed.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Structure Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <SearchBar value={structureSearch} onChange={setStructureSearch} placeholder='Search columns...' className='w-64' />
          <p className='text-xs text-text-secondary'>Population strategy is a property of each column.</p>
        </div>
        <Button size='sm' onClick={handleAddColumn}>
          <PlusIcon className='mr-1 h-4 w-4' />
          Add Column
        </Button>
      </div>

      {/* Structure Table - Merged Columns */}
      {filteredColumns.length > 0 ? (
        <Card>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='border-b border-border bg-surface'>
                <tr>
                  <th className='px-4 py-3 text-left'>Name</th>
                  <th className='px-4 py-3 text-left'>Data Type</th>
                  <th className='px-4 py-3 text-center'>Required</th>
                  <th className='px-4 py-3 text-center'>Unique</th>
                  <th className='px-4 py-3 text-left'>Population Strategy</th>
                  <th className='px-4 py-3 text-left'>Configuration</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredColumns.map((col, index) => (
                  <tr key={col.id} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                    <td className='px-4 py-3'>
                      <div>
                        <div className='font-mono text-xs text-text'>{col.name}</div>
                        <div className='text-xs text-text-secondary'>{col.displayName}</div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <Badge variant='outline' className='text-xs'>{col.dataType}</Badge>
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {col.required ? <Check className='mx-auto h-4 w-4 text-green-500' /> : <span className='text-text-secondary'>—</span>}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {col.unique ? <Check className='mx-auto h-4 w-4 text-green-500' /> : <span className='text-text-secondary'>—</span>}
                    </td>
                    <td className='px-4 py-3'>
                      <Badge variant={STRATEGY_COLORS[col.strategyType] || 'outline'} className='text-xs'>{col.strategyType}</Badge>
                    </td>
                    <td className='px-4 py-3 font-mono text-xs text-text-secondary'>{getStrategyDisplay(col)}</td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='sm' onClick={() => handleMoveColumn(index, 'up')} disabled={index === 0}>
                          <ArrowUp className='h-3 w-3' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleMoveColumn(index, 'down')} disabled={index === filteredColumns.length - 1}>
                          <ArrowDown className='h-3 w-3' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEditColumn(col)}>
                          <Edit className='h-3 w-3' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDeleteColumn(col)}>
                          <Trash2 className='h-3 w-3' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Database className='mb-4 h-12 w-12 text-text-secondary' />
            <p className='mb-2 text-sm font-medium text-text'>No columns defined yet</p>
            <p className='mb-4 text-xs text-text-secondary'>Add columns manually or accept AI recommendations.</p>
            <div className='flex gap-2'>
              {activeSuggestions.length > 0 && (
                <Button variant='outline' size='sm' onClick={() => setShowSuggestions(true)}>
                  <Sparkles className='mr-1 h-4 w-4' />
                  View Recommendations
                </Button>
              )}
              <Button size='sm' onClick={handleAddColumn}>
                <PlusIcon className='mr-1 h-4 w-4' />
                Add Column
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Data Tab Content - Spreadsheet Row Editor ──────────────────────────
export { DataTabContent } from '../components/DataTabContent';

// ─── Relationships Section ──────────────────────────────────────────────
interface RelationshipsSectionProps {
  datasets: Dataset[];
  projectId: string;
  setToastMessage: (msg: string) => void;
  setToastOpen: (open: boolean) => void;
}

const RelationshipsSection: React.FC<RelationshipsSectionProps> = ({
  datasets,
  projectId,
  setToastMessage,
  setToastOpen,
}) => {
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedRelationship, setSelectedRelationship] = React.useState<any>(null);

  React.useEffect(() => {
    // Load relationships on mount
    relationshipService.listByProject(projectId).then(setRelationships).catch(() => {});
  }, [projectId]);

  const handleCreate = async (data: any) => {
    try {
      const newRel = await relationshipService.create(projectId, data);
      setRelationships([...relationships, newRel]);
      setDialogOpen(false);
      setToastMessage('Relationship created successfully');
      setToastOpen(true);
    } catch (error) {
      setToastMessage('Failed to create relationship');
      setToastOpen(true);
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      const updated = await relationshipService.update(projectId, id, data);
      setRelationships(relationships.map((r) => (r.id === id ? updated : r)));
      setDialogOpen(false);
      setSelectedRelationship(null);
      setToastMessage('Relationship updated successfully');
      setToastOpen(true);
    } catch (error) {
      setToastMessage('Failed to update relationship');
      setToastOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await relationshipService.delete(projectId, id);
      setRelationships(relationships.filter((r) => r.id !== id));
      setToastMessage('Relationship deleted successfully');
      setToastOpen(true);
    } catch (error) {
      setToastMessage('Failed to delete relationship');
      setToastOpen(true);
    }
  };

  const getDatasetName = (id: string) => datasets.find((d) => d.id === id)?.name || id;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Dataset Relationships</h1>
          <p className='mt-1 text-sm text-text-secondary'>Define relationships between datasets for relational test data.</p>
        </div>
        <Button onClick={() => { setSelectedRelationship(null); setDialogOpen(true); }}>
          <Plus className='mr-2 h-4 w-4' />
          Create Relationship
        </Button>
      </div>

      {/* Relationship Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Relationship Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <div className='py-8 text-center'>
              <Network className='mx-auto mb-4 h-12 w-12 text-text-secondary' />
              <p className='text-sm font-medium text-text'>No relationships defined</p>
              <p className='text-xs text-text-secondary'>Create relationships to connect your datasets.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {relationships.map((rel) => (
                <div key={rel.id} className='flex items-center gap-4 p-3 border border-border rounded-lg'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 text-sm'>
                      <span className='font-medium'>{getDatasetName(rel.parentDatasetId)}</span>
                      <span className='text-text-secondary'>.{rel.parentColumn}</span>
                    </div>
                    <div className='flex items-center gap-2 text-xs text-text-secondary mt-1'>
                      <span>{rel.relationshipType}</span>
                      <span>•</span>
                      <span>{rel.cardinality}</span>
                      {!rel.enabled && <Badge variant='secondary' className='text-xs'>Disabled</Badge>}
                    </div>
                    <div className='flex items-center gap-2 text-sm mt-2'>
                      <span className='font-medium'>{getDatasetName(rel.childDatasetId)}</span>
                      <span className='text-text-secondary'>.{rel.childColumn}</span>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='sm' onClick={() => { setSelectedRelationship(rel); setDialogOpen(true); }}>
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => handleDelete(rel.id)}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relationship Dialog */}
      <RelationshipDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedRelationship(null); }}
        onSubmit={selectedRelationship ? (data) => handleUpdate(selectedRelationship.id, data) : handleCreate}
        datasets={datasets.map((d) => ({ id: d.id, name: d.name }))}
        relationship={selectedRelationship}
      />
    </div>
  );
};

export default TestDataLibraryPage;
