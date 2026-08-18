// Test Data Library - Production Quality UI
import React, { Suspense, useCallback, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast, type ToastType } from '../../../components/shared/Toast';
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
  Link2,
  FileText,
  FlaskConical,
  BookOpen,
  Keyboard,
  FileUp,
  Wand2,
  Clock3,
} from 'lucide-react';
import { DataTabContent } from '../components/DataTabContent';
import { ProvidersSection } from '../components/ProvidersSection';
import { VirtualizedTable } from '../../../components/tables/VirtualizedTable';
import { Pagination } from '../../../components/tables/Pagination';

// Lazy load heavy dialogs for better initial bundle size
const DatasetDialog = React.lazy(() => import('../components/DatasetDialog').then(m => ({ default: m.DatasetDialog })));
const ColumnProfileDialog = React.lazy(() => import('../components/ColumnProfileDialog').then(m => ({ default: m.ColumnProfileDialog })));
const RelationshipDialog = React.lazy(() => import('../components/RelationshipDialog').then(m => ({ default: m.RelationshipDialog })));

// Import types directly
import type { DatasetDialogData } from '../components/DatasetDialog';
import type { ColumnProfileData } from '../components/ColumnProfileDialog';
import type { ColumnSuggestion } from '../services/columnService';
import { rowService } from '../services/rowService';
import { relationshipService } from '../services/relationshipService';
import { Check, X as XIcon, ArrowUp, ArrowDown, Plus as PlusIcon, Upload, FileSpreadsheet, FileJson } from 'lucide-react';
import { logger } from '../../../utils/logger';
import { useParams, useLocation } from 'react-router-dom';
import { datasetService } from '../services/datasetService';
import { projectStore } from '../../../store/projectStore';
import { MappingPage } from './MappingPage';
import { useMappings } from '../hooks/useMappings';
import { useColumns, useColumnSuggestions } from '../hooks/useColumns';
import { useProfiles } from '../hooks/useProfiles';
import { providerService } from '../services/providerService';
import type { ColumnDto, PopulationProfileDto } from '../../../types/moduleContracts';

// Memoized category badge to avoid re-renders
const CategoryBadge = React.memo<{ category: string }>(({ category }) => {
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
});
CategoryBadge.displayName = 'CategoryBadge';

// Memoized dataset card for list rendering
const DatasetCard = React.memo<{ dataset: any; onView: (d: any) => void; onEdit: (d: any) => void; onDuplicate: (d: any) => void; onDelete: (d: any) => void; }>(({ dataset, onView, onEdit, onDuplicate, onDelete }) => (
  <Card key={dataset.id} className='transition-shadow hover:shadow-lg'>
    <CardHeader>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <Database className='h-5 w-5 text-primary' />
          <div>
            <CardTitle className='text-base'>{dataset.name}</CardTitle>
            <div className='mt-1'><CategoryBadge category={dataset.category} /></div>
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
          <Button variant='outline' size='sm' className='flex-1' onClick={() => onView(dataset)}>View</Button>
          <Button variant='outline' size='sm' className='flex-1' onClick={() => onEdit(dataset)}>
            <Edit className='mr-1 h-3 w-3' /> Edit
          </Button>
          <Button variant='ghost' size='sm' onClick={() => onDuplicate(dataset)}><Copy className='h-3 w-3' /></Button>
          <Button variant='ghost' size='sm' onClick={() => onDelete(dataset)}><Trash2 className='h-3 w-3' /></Button>
        </div>
      </div>
    </CardContent>
  </Card>
));
DatasetCard.displayName = 'DatasetCard';

function columnToProfileData(
  column: ColumnDto,
  profile?: PopulationProfileDto,
): ColumnProfileData {
  return {
    id: column.id,
    datasetId: column.datasetId,
    name: column.name,
    displayName: column.displayName,
    dataType: column.dataType,
    description: column.description ?? '',
    strategyType: profile?.strategyType ?? 'Manual',
    strategyConfig: profile?.configuration ?? {},
    required: column.required,
    nullable: column.nullable,
    unique: column.unique,
  };
}

function suggestionToProfileData(suggestion: ColumnSuggestion, datasetId: string): ColumnProfileData {
  return {
    datasetId,
    name: suggestion.name,
    displayName: suggestion.displayName,
    dataType: suggestion.dataType,
    description: suggestion.description,
    strategyType: 'Manual',
    strategyConfig: {},
    required: suggestion.required,
    nullable: suggestion.nullable,
    unique: suggestion.unique,
  };
}

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
type TestDataSection = 'datasets' | 'scenarios' | 'bindings' | 'reservations' | 'mappings' | 'relationships' | 'providers' | 'datasources' | 'generators';

const CATEGORY_OPTIONS = ['General', 'Customer', 'Product', 'Order', 'Payment', 'User', 'Custom'];

const SECTION_CHIPS: {
  id: TestDataSection;
  label: string;
  icon: typeof Database;
  comingSoon?: boolean;
}[] = [
  { id: 'datasets', label: 'Datasets', icon: Database },
  { id: 'scenarios', label: 'Scenarios', icon: FlaskConical },
  { id: 'bindings', label: 'API Bindings', icon: Link2 },
  { id: 'reservations', label: 'Reservations', icon: Clock3 },
  { id: 'mappings', label: 'Mappings', icon: Link2 },
  { id: 'relationships', label: 'Relationships', icon: Network },
  { id: 'providers', label: 'Providers', icon: Sparkles },
  { id: 'datasources', label: 'Data Sources', icon: Globe, comingSoon: true },
  { id: 'generators', label: 'Generators', icon: Zap, comingSoon: true },
];

export const TestDataLibraryPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const storeProjectId = projectStore((s) => s.selectedProjectId);
  const resolvedProjectId = projectId ?? storeProjectId ?? '';
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [activeSection, setActiveSection] = React.useState<TestDataSection>('datasets');
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedDataset, setSelectedDataset] = React.useState<Dataset | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<ToastType>('success');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedColumn, setSelectedColumn] = React.useState<ColumnProfileData | undefined>(undefined);
  const [structureSearch, setStructureSearch] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [rejectedSuggestions, setRejectedSuggestions] = React.useState<Set<string>>(new Set());
  const [selectedSuggestionIds, setSelectedSuggestionIds] = React.useState<Set<string>>(new Set());
  const [importWizardOpen, setImportWizardOpen] = React.useState(false);
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
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
  const [importTargetDatasetId, setImportTargetDatasetId] = React.useState('');
  const [importDatasetMode, setImportDatasetMode] = React.useState<'existing' | 'new'>('new');
  const [importNewDatasetName, setImportNewDatasetName] = React.useState('');
  const [relationshipDialogOpen, setRelationshipDialogOpen] = React.useState(false);
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const [datasets, setDatasets] = React.useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = React.useState(true);
  const [datasetsError, setDatasetsError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const { mappings } = useMappings(resolvedProjectId);
  const [providerCount, setProviderCount] = React.useState(0);
  const [relationshipCount, setRelationshipCount] = React.useState(0);

  React.useEffect(() => {
    if (!resolvedProjectId) return;
    providerService.listByProject(resolvedProjectId).then((p) => setProviderCount(p.length)).catch(() => {});
    relationshipService.listByProject(resolvedProjectId).then((r) => setRelationshipCount(r.length)).catch(() => {});
  }, [resolvedProjectId]);

  const sectionCounts = React.useMemo(
    () => ({
      datasets: datasets.length,
      scenarios: 0,
      bindings: 0,
      reservations: 0,
      mappings: (mappings ?? []).length,
      relationships: relationshipCount,
      providers: providerCount,
      datasources: 0,
      generators: 0,
    }),
    [datasets.length, mappings, relationshipCount, providerCount]
  );
  React.useEffect(() => {
    const loadDatasets = async () => {
      if (!projectId) {
        setDatasets([]);
        setIsLoadingDatasets(false);
        return;
      }
      try {
        setIsLoadingDatasets(true);
        setDatasetsError(null);
        const data = await datasetService.listDatasets(projectId);
        setDatasets(
          data.map((d) => ({
            id: d.id,
            projectId: d.projectId,
            name: d.name,
            description: d.description || '',
            category: d.category || 'General',
            rows: d.rowCount ?? 0,
            columns: 0,
            relationships: 0,
            lastUpdated: new Date(d.updatedAt).toLocaleString(),
            created: new Date(d.createdAt).toLocaleString(),
            usedBy: { requirements: 0, suites: 0, apis: 0, knowledge: 0 },
          })),
        );
      } catch (err) {
        setDatasetsError(err instanceof Error ? err.message : 'Failed to load datasets');
        logger.error('Failed to load datasets', err);
      } finally {
        setIsLoadingDatasets(false);
      }
    };

    void loadDatasets();
  }, [projectId]);

  React.useEffect(() => {
    const afterTestData = location.pathname.split('/testdata')[1] ?? '';
    const segment = afterTestData.replace(/^\//, '').split('/')[0] || '';
    const segmentToSection: Record<string, TestDataSection> = {
      '': 'datasets',
      rows: 'datasets',
      mapping: 'mappings',
      mappings: 'mappings',
      relationships: 'relationships',
      providers: 'providers',
      generators: 'generators',
    };
    const next = segmentToSection[segment];
    if (next) setActiveSection(next);
  }, [location.pathname]);

  // Load datasets on mount

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
      projectId: resolvedProjectId,
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

  const handleDuplicate = useCallback((dataset: Dataset) => {
    const duplicate: Dataset = {
      ...dataset,
      id: Date.now().toString(),
      projectId: dataset.projectId,
      name: `${dataset.name} Copy`,
      lastUpdated: 'Just now',
      usedBy: { requirements: 0, suites: 0, apis: 0, knowledge: 0 },
    };
    setDatasets((current) => [...current, duplicate]);
    setToastMessage('Dataset duplicated successfully');
    setToastOpen(true);
  }, []);

  const openDatasetDetails = useCallback((dataset: Dataset) => {
    setSelectedDataset(dataset);
    setDetailsOpen(true);
    setActiveTab('Overview');
    setShowSuggestions(false);
    setRejectedSuggestions(new Set());
    setSelectedSuggestionIds(new Set());
  }, []);

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
    setImportTargetDatasetId('');
    setImportDatasetMode('new');
    setImportNewDatasetName('');
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const IMPORT_FILE_HELP_MESSAGE =
    'Import could not run. In step 1, upload a CSV or JSON file with a header row and at least one data row, then try again.';

  const showToast = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };

  const getImportFileIssue = (): string | null => {
    if (!importFile) {
      return IMPORT_FILE_HELP_MESSAGE;
    }
    const ext = importFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      return 'Only .csv and .json files are supported. Go back to step 1 and choose a supported file.';
    }
    if (importColumns.length === 0) {
      return IMPORT_FILE_HELP_MESSAGE;
    }
    return null;
  };

  const dismissImportWizardWithError = (message: string) => {
    setImportWizardOpen(false);
    resetImportWizard();
    showToast(message, 'error');
  };

  const isImportUploadErrorMessage = (message: string) =>
    /no file uploaded/i.test(message);

  const handleFileSelect = (file: File | null) => {
    setImportFile(file);
    if (file) {
      const baseName = file.name.replace(/\.[^.]+$/, '').trim();
      if (baseName) {
        setImportNewDatasetName(baseName);
      }
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

  const resolveImportDatasetId = () =>
    importTargetDatasetId || selectedDataset?.id || '';

  const usesNewDatasetForImport = () =>
    datasets.length === 0 || importDatasetMode === 'new';

  const isImportTargetReady = () => {
    if (usesNewDatasetForImport()) {
      return importNewDatasetName.trim().length > 0;
    }
    return Boolean(resolveImportDatasetId());
  };

  const ensureImportDatasetId = async (): Promise<string> => {
    if (!usesNewDatasetForImport()) {
      const id = resolveImportDatasetId();
      if (!id) {
        throw new Error('Select a dataset to import into');
      }
      return id;
    }

    if (importTargetDatasetId) {
      return importTargetDatasetId;
    }

    const name = importNewDatasetName.trim();
    if (!name) {
      throw new Error('Enter a name for the new dataset');
    }

    const created = await datasetService.createDataset(resolvedProjectId, {
      name,
      description: importFile ? `Imported from ${importFile.name}` : undefined,
      category: 'Custom',
    });
    setImportTargetDatasetId(created.id);
    setImportDatasetMode('existing');
    return created.id;
  };

  const reloadDatasets = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await datasetService.listDatasets(projectId);
      setDatasets(
        data.map((d) => ({
          id: d.id,
          projectId: d.projectId,
          name: d.name,
          description: d.description || '',
          category: d.category || 'General',
          rows: d.rowCount ?? 0,
          columns: 0,
          relationships: 0,
          lastUpdated: new Date(d.updatedAt).toLocaleString(),
          created: new Date(d.createdAt).toLocaleString(),
          usedBy: { requirements: 0, suites: 0, apis: 0, knowledge: 0 },
        })),
      );
    } catch (err) {
      logger.error('Failed to reload datasets', err);
    }
  }, [projectId]);

  const handleNextStep = async () => {
    if (importStep < 5) {
      if (importStep === 1) {
        const fileIssue = getImportFileIssue();
        if (fileIssue) {
          showToast(fileIssue, 'error');
          return;
        }
      }
      if (importStep === 4 && !isImportTargetReady()) {
        showToast(
          usesNewDatasetForImport()
            ? 'Enter a name for the new dataset'
            : 'Select a dataset to import into',
          'error',
        );
        return;
      }
      setImportStep(importStep + 1);
      return;
    }

    // Step 5: run import, then allow Finish to close
    if (importResult) {
      setImportWizardOpen(false);
      resetImportWizard();
      void reloadDatasets();
      showToast('Import completed', 'success');
      return;
    }

    const fileIssue = getImportFileIssue();
    if (fileIssue) {
      dismissImportWizardWithError(fileIssue);
      return;
    }

    setIsImporting(true);
    try {
      const datasetId = await ensureImportDatasetId();
      const result = await rowService.importData(
        resolvedProjectId,
        datasetId,
        importFile!,
        importOptions,
      );
      setImportResult(result);
      await reloadDatasets();
    } catch (error) {
      logger.error('Dataset import failed', error);
      const message = error instanceof Error ? error.message : 'Import failed';
      if (isImportUploadErrorMessage(message)) {
        dismissImportWizardWithError(IMPORT_FILE_HELP_MESSAGE);
        return;
      }
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const canProceed = () => {
    if (isImporting) return false;
    if (importStep === 1) return importFile !== null && importColumns.length > 0;
    if (importStep >= 2 && importStep <= 4) return getImportFileIssue() === null;
    if (importStep === 4) return isImportTargetReady();
    if (importStep === 5) return true;
    return true;
  };

  const primaryWizardLabel = () => {
    if (importStep < 5) return 'Next';
    if (importResult) return 'Finish';
    return 'Import';
  };

  // Navigation Items — section chips rendered in main layout
  const handlers = useMemo(() => ({
    onView: (dataset: Dataset) => openDatasetDetails(dataset),
    onEdit: (dataset: Dataset) => { setSelectedDataset(dataset); setEditOpen(true); },
    onDuplicate: (dataset: Dataset) => handleDuplicate(dataset),
    onDelete: (dataset: Dataset) => { setSelectedDataset(dataset); setDeleteOpen(true); },
  }), [openDatasetDetails, handleDuplicate]);

  if (!resolvedProjectId) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center text-text-secondary">
        Open a project from the Projects page to manage test data.
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Test data</h1>
            <p className='mt-1 max-w-2xl text-sm text-text-secondary'>
              Optional datasets, mappings, and providers — use when tests need tables of inputs or linked columns.
            </p>
          </div>
          {activeSection === 'datasets' && (
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  const defaultId = selectedDataset?.id ?? datasets[0]?.id ?? '';
                  setImportTargetDatasetId(defaultId);
                  setImportDatasetMode(datasets.length > 0 ? 'existing' : 'new');
                  setImportWizardOpen(true);
                }}
              >
                <Upload className='mr-2 h-4 w-4' />
                Import Dataset
              </Button>
              <Button onClick={() => { setSelectedDataset(null); setEditOpen(true); }}>
                <Plus className='mr-2 h-4 w-4' />
                New Dataset
              </Button>
            </div>
          )}
        </div>
        <div className='mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          {SECTION_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const active = activeSection === chip.id;
            const count = sectionCounts[chip.id];
            return (
              <button
                key={chip.id}
                type='button'
                onClick={() => setActiveSection(chip.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  chip.comingSoon
                    ? 'border-border bg-surface/50 opacity-90'
                    : active
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                <div className='flex items-center justify-between gap-1'>
                  <div className='flex items-center gap-2 text-xs font-medium text-text-secondary'>
                    <Icon className='h-3.5 w-3.5' />
                    {chip.label}
                  </div>
                  {chip.comingSoon ? (
                    <Badge variant='secondary' className='text-[10px]'>
                      Soon
                    </Badge>
                  ) : null}
                </div>
                <p className='mt-1 text-xl font-semibold text-text'>{chip.comingSoon ? '—' : count}</p>
              </button>
            );
          })}
        </div>

          {activeSection === 'relationships' && (
            <RelationshipsSection
              datasets={datasets}
              projectId={resolvedProjectId}
              setToastMessage={setToastMessage}
              setToastOpen={setToastOpen}
            />
          )}

          {activeSection === 'providers' && (
            <ProvidersSection
              projectId={resolvedProjectId}
              setToastMessage={setToastMessage}
              setToastOpen={setToastOpen}
            />
          )}

          {(activeSection === 'scenarios' || activeSection === 'bindings' || activeSection === 'reservations') && (
            <DataFlowSection section={activeSection} projectId={resolvedProjectId} datasets={datasets} />
          )}

          {activeSection === 'mappings' && <MappingPage embedded />}

          {(activeSection === 'datasources' || activeSection === 'generators') && (
            <div className='flex flex-col items-center justify-center py-20'>
              <div className='mb-4 rounded-full bg-primary/10 p-6'>
                {activeSection === 'datasources' && <Globe className='h-12 w-12 text-primary' />}
                {activeSection === 'generators' && <Zap className='h-12 w-12 text-primary' />}
              </div>
              <h3 className='mb-2 text-2xl font-bold text-text'>Coming Soon</h3>
              <p className='mb-6 max-w-md text-center text-sm text-text-secondary'>
                {activeSection === 'datasources' &&
                  'Manage where execution data comes from. Configure datasets, environment variables, runtime responses, and AI-generated data sources.'}
                {activeSection === 'generators' && 'Reusable value generators for creating realistic test data on the fly.'}
              </p>
              <Badge variant='outline' className='text-xs'>
                Available in next release
              </Badge>
            </div>
          )}

          {activeSection === 'datasets' && (
            <>
              <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex flex-1 items-center gap-3'>
                  <SearchBar value={search} onChange={setSearch} placeholder='Search datasets...' className='sm:w-80' />
                  <div className='flex flex-wrap gap-2'>
                    {['All', ...CATEGORY_OPTIONS].map((category) => (
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
                  title='No datasets yet'
                  description='Most API tests use generated payloads from your contract. Add a dataset when you need reusable rows (e.g. login users).'
                  action={{ label: 'Create dataset', onClick: () => setEditOpen(true) }}
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
                  <VirtualizedTable
                    data={filteredDatasets}
                    columns={[
                      { key: 'name', header: 'Name', render: (row: any) => <span className='font-medium'>{row.name}</span> },
                      { key: 'category', header: 'Category', render: (row: any) => getCategoryBadge(row.category) },
                      { key: 'rows', header: 'Rows', render: (row: any) => row.rows.toLocaleString() },
                      { key: 'columns', header: 'Columns', render: (row: any) => row.columns },
                      { key: 'relationships', header: 'Relationships', render: (row: any) => row.relationships },
                      { key: 'lastUpdated', header: 'Last Updated', render: (row: any) => <span className='text-text-secondary'>{row.lastUpdated}</span> },
                      {
                        key: 'actions',
                        header: 'Actions',
                        render: (row: any) => (
                          <div className='flex items-center justify-end gap-1'>
                            <Button variant='ghost' size='sm' onClick={() => openDatasetDetails(row)}>
                              <ChevronRight className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => { setSelectedDataset(row); setEditOpen(true); }}>
                              <Edit className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => handleDuplicate(row)}>
                              <Copy className='h-3 w-3' />
                            </Button>
                            <Button variant='ghost' size='sm' onClick={() => { setSelectedDataset(row); setDeleteOpen(true); }}>
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                    totalCount={filteredDatasets.length}
                    rowHeight={56}
                    overscan={5}
                  />
                  <Pagination
                    page={currentPage}
                    totalPages={Math.max(1, Math.ceil(filteredDatasets.length / pageSize))}
                    pageSize={pageSize}
                    totalItems={filteredDatasets.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
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
                      <Card>
                        <CardContent className='flex flex-col items-center justify-center py-12'>
                          <Database className='mb-4 h-12 w-12 text-text-secondary' />
                          <p className='mb-2 text-sm font-medium text-text'>Data editor coming soon</p>
                          <p className='text-xs text-text-secondary'>Connect to backend API to enable spreadsheet editing.</p>
                        </CardContent>
                      </Card>
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
                          <div
                            className='cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary'
                            onClick={() => importFileInputRef.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                importFileInputRef.current?.click();
                              }
                            }}
                            role='button'
                            tabIndex={0}
                          >
                            <Upload className='mx-auto mb-4 h-12 w-12 text-text-secondary' />
                            <h3 className='mb-2 text-sm font-medium text-text'>Upload File</h3>
                            <p className='mb-4 text-xs text-text-secondary'>
                              Click anywhere here or drop a file. Supports CSV and JSON formats.
                            </p>
                            <input
                              ref={importFileInputRef}
                              type='file'
                              accept='.csv,.json'
                              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                              className='hidden'
                              onClick={(e) => e.stopPropagation()}
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
                          <div>
                            <label className='mb-1 block text-xs font-medium text-text-secondary'>
                              Target dataset <span className='text-red-500'>*</span>
                            </label>
                            {datasets.length > 0 ? (
                              <div className='mb-3 flex flex-wrap gap-4 text-sm text-text'>
                                <label className='flex cursor-pointer items-center gap-2'>
                                  <input
                                    type='radio'
                                    name='importDatasetMode'
                                    checked={importDatasetMode === 'existing'}
                                    onChange={() => setImportDatasetMode('existing')}
                                  />
                                  Existing dataset
                                </label>
                                <label className='flex cursor-pointer items-center gap-2'>
                                  <input
                                    type='radio'
                                    name='importDatasetMode'
                                    checked={importDatasetMode === 'new'}
                                    onChange={() => setImportDatasetMode('new')}
                                  />
                                  Create new dataset
                                </label>
                              </div>
                            ) : (
                              <p className='mb-2 text-xs text-text-secondary'>
                                No datasets yet — name the dataset that will be created from this file.
                              </p>
                            )}
                            {usesNewDatasetForImport() ? (
                              <input
                                type='text'
                                value={importNewDatasetName}
                                onChange={(e) => setImportNewDatasetName(e.target.value)}
                                placeholder='Dataset name'
                                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
                              />
                            ) : (
                              <select
                                value={importTargetDatasetId}
                                onChange={(e) => setImportTargetDatasetId(e.target.value)}
                                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
                              >
                                <option value=''>Select dataset…</option>
                                {datasets.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
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
                            <p className='text-sm text-text-secondary'>
                              Click &quot;Import&quot; to load rows into the selected dataset.
                            </p>
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
                        onClick={() => void handleNextStep()}
                        disabled={!canProceed()}
                      >
                        {isImporting ? 'Importing…' : primaryWizardLabel()}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}

              {editOpen && (
                <Suspense fallback={<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'><div className='text-sm text-text-secondary'>Loading...</div></div>}>
                  <DatasetDialog
                    open={editOpen}
                    onClose={() => { setEditOpen(false); setSelectedDataset(null); }}
                    onSubmit={selectedDataset ? handleUpdate : handleCreate}
                    dataset={selectedDataset ? {
                      id: selectedDataset.id,
                      projectId: selectedDataset.projectId,
                      name: selectedDataset.name,
                      description: selectedDataset.description,
                      category: selectedDataset.category,
                    } : undefined}
                    isSubmitting={isSubmitting}
                  />
                </Suspense>
              )}

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
              <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} type={toastType} />
            </>
          )}
          <ApiDataReadiness projectId={resolvedProjectId} />
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

// Mock data removed - connect to real API endpoints

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
      return `${dsId}.${col}`;
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
  const {
    columns: columnDtos = [],
    createAsync: createColumnAsync,
    updateAsync: updateColumnAsync,
    removeAsync: removeColumnAsync,
    isLoading: isLoadingColumns,
    error: columnsError,
  } = useColumns(dataset.projectId, dataset.id);
  const {
    profiles: profileDtos = [],
    createAsync: createProfileAsync,
    updateAsync: updateProfileAsync,
    removeAsync: removeProfileAsync,
  } = useProfiles(dataset.projectId, dataset.id);
  const {
    suggestions: suggestionDtos = [],
    isLoading: isLoadingSuggestions,
  } = useColumnSuggestions(dataset.projectId, dataset.name);

  const [columns, setColumns] = React.useState<ColumnProfileData[]>([]);
  const profileByColumnId = React.useMemo(
    () => new Map(profileDtos.map((profile) => [profile.columnId, profile] as const)),
    [profileDtos],
  );

  React.useEffect(() => {
    setColumns(columnDtos.map((column) => columnToProfileData(column, profileByColumnId.get(column.id))));
  }, [columnDtos, profileByColumnId]);

  const filteredColumns = React.useMemo(() => {
    const term = structureSearch.trim().toLowerCase();
    return columns.filter((col) =>
      col.name.toLowerCase().includes(term) ||
      col.displayName.toLowerCase().includes(term) ||
      col.dataType.toLowerCase().includes(term) ||
      col.strategyType.toLowerCase().includes(term)
    );
  }, [structureSearch, columns]);

  const activeSuggestions = React.useMemo(() => {
    const currentNames = new Set(columns.map((column) => column.name.toLowerCase()));
    return suggestionDtos.filter(
      (suggestion) =>
        !rejectedSuggestions.has(suggestion.name) &&
        !currentNames.has(suggestion.name.toLowerCase()),
    );
  }, [suggestionDtos, rejectedSuggestions, columns]);

  const persistColumn = async (data: ColumnProfileData) => {
    const profilePayload = {
      strategyType: data.strategyType,
      configuration: data.strategyConfig ?? {},
    };

    if (data.id) {
      const updatedColumn = await updateColumnAsync(data.id, {
        name: data.name,
        displayName: data.displayName,
        dataType: data.dataType,
        required: data.required,
        unique: data.unique,
        nullable: data.nullable,
        description: data.description,
      });
      const existingProfile = profileByColumnId.get(data.id);
      if (existingProfile) {
        await updateProfileAsync(existingProfile.id, profilePayload);
      } else {
        await createProfileAsync({
          projectId: dataset.projectId,
          datasetId: dataset.id,
          columnId: updatedColumn.id,
          ...profilePayload,
        });
      }
      return;
    }

    const createdColumn = await createColumnAsync({
      projectId: dataset.projectId,
      datasetId: dataset.id,
      name: data.name,
      displayName: data.displayName,
      dataType: data.dataType,
      required: data.required,
      unique: data.unique,
      nullable: data.nullable,
      description: data.description,
    });
    await createProfileAsync({
      projectId: dataset.projectId,
      datasetId: dataset.id,
      columnId: createdColumn.id,
      ...profilePayload,
    });
  };

  const acceptSuggestion = async (suggestion: ColumnSuggestion) => {
    const nextColumn = suggestionToProfileData(suggestion, dataset.id);
    await persistColumn(nextColumn);
  };

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

  const handleDeleteColumn = async (col: ColumnProfileData) => {
    try {
      const existingProfile = col.id ? profileByColumnId.get(col.id) : undefined;
      if (existingProfile) {
        await removeProfileAsync(existingProfile.id);
      }
      if (col.id) {
        await removeColumnAsync(col.id);
      }
      setToastMessage('Column deleted successfully');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to delete column', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete column');
      setToastOpen(true);
    }
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

  const handleAcceptAllSuggestions = async () => {
    if (activeSuggestions.length === 0) {
      setToastMessage('No suggestions available');
      setToastOpen(true);
      return;
    }

    try {
      let added = 0;
      for (const suggestion of activeSuggestions) {
        await acceptSuggestion(suggestion);
        added += 1;
      }
      setSelectedSuggestionIds(new Set());
      setShowSuggestions(false);
      setToastMessage(`Added ${added} suggested column${added === 1 ? '' : 's'}.`);
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to accept suggested columns', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to add suggested columns');
      setToastOpen(true);
    }
  };

  const handleAcceptSelectedSuggestions = async () => {
    const selected = activeSuggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.name));
    if (selected.length === 0) {
      setToastMessage('Select at least one suggestion first.');
      setToastOpen(true);
      return;
    }

    try {
      let added = 0;
      for (const suggestion of selected) {
        await acceptSuggestion(suggestion);
        added += 1;
      }
      setSelectedSuggestionIds(new Set());
      setShowSuggestions(false);
      setToastMessage(`Added ${added} suggested column${added === 1 ? '' : 's'}.`);
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to accept selected suggestions', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to add selected suggestions');
      setToastOpen(true);
    }
  };

  const handleSkipSuggestions = () => {
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
    const next = new Set(selectedSuggestionIds);
    next.delete(name);
    setSelectedSuggestionIds(next);
    setRejectedSuggestions(new Set([...rejectedSuggestions, name]));
  };

  return (
    <div className='space-y-4'>
      {isLoadingColumns && (
        <Card className='border-dashed border-border bg-surface/50'>
          <CardContent className='py-4 text-sm text-text-secondary'>
            Loading columns...
          </CardContent>
        </Card>
      )}
      {columnsError && (
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='py-4 text-sm text-red-700'>
            {columnsError instanceof Error ? columnsError.message : 'Failed to load columns'}
          </CardContent>
        </Card>
      )}
      {/* AI Recommendations Banner */}
      {!showSuggestions && isLoadingSuggestions && (
        <Card className='border-dashed border-border bg-surface/50'>
          <CardContent className='py-4 text-sm text-text-secondary'>
            Looking for recommendations...
          </CardContent>
        </Card>
      )}
      {!showSuggestions && !isLoadingSuggestions && activeSuggestions.length > 0 && (
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
                <Button size='sm' variant='default' onClick={() => void handleAcceptAllSuggestions()}>
                  <Check className='mr-1 h-4 w-4' />
                  Accept All
                </Button>
                <Button size='sm' variant='outline' onClick={() => void handleAcceptSelectedSuggestions()} disabled={selectedSuggestionIds.size === 0}>
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
                        <Button variant='ghost' size='sm' onClick={() => void handleDeleteColumn(col)}>
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

      {editorOpen && (
        <Suspense fallback={<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'><div className='text-sm text-text-secondary'>Loading editor...</div></div>}>
          <ColumnProfileDialog
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            onSubmit={(data) => {
              void (async () => {
                try {
                  await persistColumn(data);
                  setEditorOpen(false);
                  setSelectedColumn(undefined);
                  setToastMessage(data.id ? 'Column updated successfully' : 'Column added successfully');
                  setToastOpen(true);
                } catch (err) {
                  logger.error('Failed to save column', err);
                  setToastMessage(err instanceof Error ? err.message : 'Failed to save column');
                  setToastOpen(true);
                }
              })();
            }}
            column={selectedColumn}
            isSubmitting={false}
          />
        </Suspense>
      )}
    </div>
  );
};

// ─── Data Tab Content - Spreadsheet Row Editor ──────────────────────────
export { DataTabContent } from '../components/DataTabContent';

// ─── Relationships Section ──────────────────────────────────────────────
interface DataScenario {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

interface ApiDataRecommendation {
  collection: string;
  endpoint: string;
  method: string;
  field: string;
  category: string;
  recommendation: string;
  reason: string;
}

const ApiDataReadiness: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [recommendations, setRecommendations] = React.useState<ApiDataRecommendation[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`testforge:api-workspace:imports:project:${projectId}`);
      const artifacts = raw ? JSON.parse(raw) as Array<{ kind: string; name: string; endpoints?: Array<any> }> : [];
      const rows: ApiDataRecommendation[] = [];
      artifacts.filter((artifact) => artifact.kind === 'api').forEach((collection) => {
        (collection.endpoints || []).forEach((endpoint) => {
          const draft = endpoint.requestTemplate || {};
          const fields = [
            ...(draft.pathParams || []).map((row: any) => row.key),
            ...(draft.queryParams || []).map((row: any) => row.key),
            ...(draft.formDataRows || []).map((row: any) => row.key),
            ...(draft.urlEncodedRows || []).map((row: any) => row.key),
          ].filter(Boolean);
          const parsedBody = typeof draft.rawBody === 'string' ? (() => { try { return JSON.parse(draft.rawBody); } catch { return {}; } })() : {};
          if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) fields.push(...Object.keys(parsedBody));
          Array.from(new Set(fields.map((field: string) => field.trim()))).forEach((field) => {
            const normalized = field.toLowerCase();
            const endpointContext = `${endpoint.name || ''} ${endpoint.url || ''}`.toLowerCase();
            const identityFlow = /login|signin|authenticate|token|session|password\/reset/.test(endpointContext);
            let category = 'Static input';
            let recommendation = 'Keep request value';
            let reason = 'No dynamic strategy is required.';
            if (/email|e-mail/.test(normalized)) {
              category = identityFlow ? 'Existing identity' : 'Unique identity';
              recommendation = identityFlow ? 'Existing dataset email' : 'Unique email or dataset email';
              reason = identityFlow ? 'Login and authentication flows need an existing account.' : 'Registration-style flows usually need a fresh address.';
            } else if (/timestamp|epoch|created.?at|updated.?at|time/.test(normalized)) {
              category = 'Generated value';
              recommendation = 'Unix timestamp (number)';
              reason = 'This field looks time-based and can be generated at execution time.';
            } else if (/uuid|guid/.test(normalized)) {
              category = 'Generated identity';
              recommendation = 'UUID or dataset value';
              reason = 'Use a UUID for new entities or a dataset value for existing entities.';
            } else if (/id|account|user/.test(normalized)) {
              category = 'Linked value';
              recommendation = 'Previous response or dataset';
              reason = 'This field may depend on an entity created by an earlier request.';
            } else if (/password|secret|key|token/.test(normalized)) {
              category = 'Sensitive value';
              recommendation = 'Environment or existing dataset';
              reason = 'Sensitive values should not be randomly generated by default.';
            }
            rows.push({ collection: collection.name, endpoint: endpoint.name || endpoint.path || 'Unnamed endpoint', method: endpoint.method || 'REQUEST', field, category, recommendation, reason });
          });
        });
      });
      setRecommendations(rows);
    } catch {
      setRecommendations([]);
    }
  }, [projectId]);

  if (recommendations.length === 0) return null;
  const managedFields = recommendations.filter((item) => item.category !== 'Static input');
  const staticFields = recommendations.filter((item) => item.category === 'Static input');
  const usage = new Map<string, { field: string; endpoints: Set<string>; category: string; recommendation: string }>();
  managedFields.forEach((item) => {
    const existing = usage.get(item.field.toLowerCase());
    if (existing) existing.endpoints.add(`${item.collection}:${item.endpoint}`);
    else usage.set(item.field.toLowerCase(), { field: item.field, endpoints: new Set([`${item.collection}:${item.endpoint}`]), category: item.category, recommendation: item.recommendation });
  });
  const managedFieldSummary = Array.from(usage.values());
  const renderEndpointRows = (items: ApiDataRecommendation[]) => <div className='space-y-3'>{items.map((item, index) => <div key={`${item.collection}-${item.endpoint}-${item.field}-${index}`} className='grid gap-3 rounded-lg border border-border bg-background/50 p-3 md:grid-cols-[1.1fr_1fr_1fr_1.5fr] md:items-center'><div><div className='flex items-center gap-2'><Badge variant='secondary'>{item.method}</Badge><span className='font-medium text-text'>{item.endpoint}</span></div><p className='mt-1 text-xs text-text-secondary'>{item.collection}</p></div><div><p className='text-xs text-text-secondary'>Field</p><p className='font-medium text-text'>{item.field}</p></div><div><p className='text-xs text-text-secondary'>Category</p><Badge variant='outline'>{item.category}</Badge></div><div><p className='text-xs text-text-secondary'>Recommendation</p><p className='font-medium text-text'>{item.recommendation}</p><p className='mt-1 text-xs text-text-secondary'>{item.reason}</p></div></div>)}</div>;
  return <Card className='mb-6 border-primary/30 bg-primary/5'><CardHeader><div className='flex items-start justify-between gap-4'><div><CardTitle>API Data Readiness</CardTitle><p className='mt-1 text-sm text-text-secondary'>Detected request fields and how they should be supplied during API execution.</p></div><Badge variant='outline'>{managedFields.length} managed fields</Badge></div></CardHeader><CardContent className='space-y-6'>
    <section><div className='mb-3 flex items-center justify-between'><div><h3 className='font-semibold text-text'>Fields requiring test data</h3><p className='text-xs text-text-secondary'>These fields should use generated values, datasets, or previous responses.</p></div><Badge variant='secondary'>{managedFieldSummary.length} unique fields</Badge></div><div className='mb-4 grid gap-2 md:grid-cols-3'>{managedFieldSummary.map((item) => <div key={item.field} className='rounded-lg border border-primary/20 bg-primary/10 p-3'><div className='flex items-center justify-between gap-2'><span className='font-medium text-text'>{item.field}</span><Badge variant='outline'>{item.endpoints.size} API{item.endpoints.size === 1 ? '' : 's'}</Badge></div><p className='mt-1 text-xs text-text-secondary'>{item.category} · {item.recommendation}</p></div>)}</div>{renderEndpointRows(managedFields)}</section>
    {staticFields.length > 0 && <section className='border-t border-border pt-5'><div className='mb-3 flex items-center justify-between'><div><h3 className='font-semibold text-text'>Fields using existing payload values</h3><p className='text-xs text-text-secondary'>These fields currently do not need managed test data.</p></div><Badge variant='outline'>{staticFields.length} fields</Badge></div>{renderEndpointRows(staticFields)}</section>}
    <p className='text-xs text-text-secondary'>Configure managed fields from the selected API endpoint under Runtime test data. This page provides the central overview.</p>
  </CardContent></Card>;
};

const DataFlowSection: React.FC<{ section: 'scenarios' | 'bindings' | 'reservations'; projectId: string; datasets: Dataset[] }> = ({ section, projectId, datasets }) => {
  const scenarioKey = `testforge:test-data:scenarios:${projectId}`;
  const [scenarios, setScenarios] = React.useState<DataScenario[]>([]);
  const [scenarioName, setScenarioName] = React.useState('');
  const [reservedRows, setReservedRows] = React.useState<Array<{ dataset: string; rowId: string; reservedAt?: number }>>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(scenarioKey);
      setScenarios(stored ? JSON.parse(stored) as DataScenario[] : []);
    } catch { setScenarios([]); }
  }, [scenarioKey]);

  React.useEffect(() => {
    if (section !== 'reservations' || !projectId) return;
    let cancelled = false;
    void Promise.all(datasets.map(async (dataset) => {
      const rows = await rowService.listRows(projectId, dataset.id);
      return rows.filter((row) => Boolean((row as any).reservedBy)).map((row) => ({ dataset: dataset.name, rowId: row.id, reservedAt: (row as any).reservedAt }));
    })).then((groups) => { if (!cancelled) setReservedRows(groups.flat()); }).catch(() => { if (!cancelled) setReservedRows([]); });
    return () => { cancelled = true; };
  }, [datasets, projectId, section]);

  const addScenario = () => {
    const name = scenarioName.trim();
    if (!name) return;
    const next = [...scenarios, { id: `${Date.now()}`, name, description: 'Reusable data context for API execution', createdAt: Date.now() }];
    setScenarios(next);
    localStorage.setItem(scenarioKey, JSON.stringify(next));
    setScenarioName('');
  };

  if (section === 'scenarios') return <Card><CardHeader><CardTitle>Data Scenarios</CardTitle><p className='text-sm text-text-secondary'>Reusable data contexts for registration, login, admin, and other API workflows.</p></CardHeader><CardContent className='space-y-4'><div className='flex gap-2'><input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addScenario(); }} placeholder='Scenario name, e.g. Existing Login User' className='h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-text outline-none' /><Button onClick={addScenario}><Plus className='mr-2 h-4 w-4' />Create scenario</Button></div>{scenarios.length === 0 ? <EmptyState title='No scenarios yet' description='Create a scenario to group reusable dataset values for API workflows.' /> : <div className='grid gap-3 md:grid-cols-2'>{scenarios.map((scenario) => <div key={scenario.id} className='rounded-lg border border-border p-4'><div className='flex items-center justify-between'><span className='font-medium text-text'>{scenario.name}</span><Badge variant='outline'>Reusable</Badge></div><p className='mt-2 text-sm text-text-secondary'>{scenario.description}</p></div>)}</div>}</CardContent></Card>;

  if (section === 'bindings') {
    let bindings: Array<{ field: string; strategy: string }> = [];
    try { const runtime = JSON.parse(localStorage.getItem(`testforge:api-workspace:runtime-data:project:${projectId}`) || '{}') as Record<string, Array<{ field: string; strategy: string }>>; bindings = Object.values(runtime).flat(); } catch { bindings = []; }
    return <Card><CardHeader><CardTitle>API Bindings</CardTitle><p className='text-sm text-text-secondary'>Runtime mappings that feed test data into API requests.</p></CardHeader><CardContent>{bindings.length === 0 ? <EmptyState title='No API bindings yet' description='Configure Runtime test data from an API endpoint Settings tab.' /> : <div className='space-y-2'>{bindings.map((binding, index) => <div key={`${binding.field}-${index}`} className='flex items-center justify-between rounded-lg border border-border p-3'><span className='font-medium text-text'>{binding.field}</span><Badge variant='secondary'>{binding.strategy}</Badge></div>)}</div>}</CardContent></Card>;
  }

  return <Card><CardHeader><CardTitle>Reservations</CardTitle><p className='text-sm text-text-secondary'>Rows consumed by API execution are reserved server-side and will not be reused.</p></CardHeader><CardContent>{reservedRows.length === 0 ? <EmptyState title='No reserved rows' description='Reserved rows appear here after a dataset-backed API request runs.' /> : <div className='space-y-2'>{reservedRows.map((row) => <div key={row.rowId} className='flex items-center justify-between rounded-lg border border-border p-3'><div><span className='font-medium text-text'>{row.dataset}</span><span className='ml-3 text-xs text-text-secondary'>{row.rowId}</span></div><Badge variant='outline'>{row.reservedAt ? new Date(row.reservedAt).toLocaleString() : 'Reserved'}</Badge></div>)}</div>}</CardContent></Card>;
};

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
