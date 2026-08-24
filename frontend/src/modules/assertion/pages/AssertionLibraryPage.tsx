// External libraries
import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ProjectContextMissing } from '../../../components/shared/ProjectContextMissing';
import { useAssertions } from '../hooks/useAssertions';
import { projectStore } from '../../../store/projectStore';
import type { Assertion, AssertionCategory, AssertionSeverity, AssertionType } from '../types';
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export interface AssertionLibraryPageProps {}

export const AssertionLibraryPage: React.FC<AssertionLibraryPageProps> = () => {
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId ?? selectedProjectId;
  if (!projectId) return <ProjectContextMissing />;
  return <AssertionLibraryPageContent projectId={projectId} />;
};

const AssertionLibraryPageContent: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { assertions, isLoading, createAssertion, updateAssertion, deleteAssertion, toggleAssertion, duplicateAssertion, refetch } = useAssertions(projectId);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedAssertion, setSelectedAssertion] = React.useState<Assertion | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [assertionToDelete, setAssertionToDelete] = React.useState<Assertion | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState<AssertionCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'enabled' | 'disabled'>('all');

  const [formData, setFormData] = React.useState<Partial<Assertion>>({
    name: '',
    description: '',
    category: 'Functional',
    enabled: true,
    type: 'HTTP Status',
    expression: '',
    expectedValue: '',
    severity: 'Major',
    tags: [],
  });
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    if (assertions.length > 0 && !selectedAssertion) {
      setSelectedAssertion(assertions[0]);
    }
  }, [assertions, selectedAssertion]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const filteredAssertions = React.useMemo(() => {
    return assertions.filter((assertion) => {
      const matchesSearch = !searchQuery.trim() || assertion.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || assertion.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'enabled' && assertion.enabled) || (filterStatus === 'disabled' && !assertion.enabled);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assertions, searchQuery, filterCategory, filterStatus]);

  const getCategoryBadge = (category: AssertionCategory) => {
    const variants: Record<AssertionCategory, 'default' | 'secondary' | 'success' | 'warning'> = {
      Functional: 'default',
      Performance: 'secondary',
      Security: 'warning',
      Data: 'success',
      Business: 'default',
      Custom: 'secondary',
    };
    return <Badge variant={variants[category]}>{category}</Badge>;
  };

  const getSeverityBadge = (severity: AssertionSeverity) => {
    const variants: Record<AssertionSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Critical: 'destructive',
      Major: 'default',
      Minor: 'secondary',
      Info: 'outline',
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  const getTypeBadge = (type: AssertionType) => {
    return <Badge variant='outline'>{type}</Badge>;
  };

  const handleCreateAssertion = async () => {
    if (!formData.name || !formData.expression) return;
    await createAssertion({ projectId, name: formData.name, description: formData.description || '', category: formData.category || 'Functional', enabled: formData.enabled ?? true, type: formData.type || 'HTTP Status', expression: formData.expression, expectedValue: formData.expectedValue || '', severity: formData.severity || 'Major', tags: formData.tags || [] });
    resetForm();
    setCreateOpen(false);
  };

  const handleDeleteAssertion = async () => {
    if (!assertionToDelete) return;
    await deleteAssertion(assertionToDelete.id);
    setDeleteOpen(false);
    setAssertionToDelete(undefined);
    if (selectedAssertion?.id === assertionToDelete.id) {
      setSelectedAssertion(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: 'Functional', enabled: true, type: 'HTTP Status', expression: '', expectedValue: '', severity: 'Major', tags: [] });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter((t) => t !== tag) });
  };

  const selectAssertion = (assertion: Assertion) => {
    setSelectedAssertion(assertion);
    setFormData(assertion);
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Assertion Library</h1>
          <p className='mt-1 text-sm text-text-secondary'>Create and manage reusable assertions for test validation.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className='mr-2 h-4 w-4' />
            Create Assertion
          </Button>
        </div>
      </div>

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <SearchBar value={searchQuery} onChange={handleSearch} placeholder='Search assertions...' className='sm:w-80' />
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text' value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as AssertionCategory | 'all')}>
            <option value='all'>All Categories</option>
            <option value='Functional'>Functional</option>
            <option value='Performance'>Performance</option>
            <option value='Security'>Security</option>
            <option value='Data'>Data</option>
            <option value='Business'>Business</option>
            <option value='Custom'>Custom</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text' value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}>
            <option value='all'>All Status</option>
            <option value='enabled'>Enabled</option>
            <option value='disabled'>Disabled</option>
          </select>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            {isLoading ? (
              <div className='p-8 text-center text-text-secondary'>Loading assertions...</div>
            ) : filteredAssertions.length === 0 ? (
              <EmptyState icon={<Search className='h-12 w-12' />} title='No assertions found' description='Create your first assertion to get started.' action={{ label: 'Create Assertion', onClick: () => { resetForm(); setCreateOpen(true); } }} />
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b border-border'>
                    <tr className='text-left text-sm text-text-secondary'>
                      <th className='px-4 py-3 font-medium'>Name</th>
                      <th className='px-4 py-3 font-medium'>Category</th>
                      <th className='px-4 py-3 font-medium'>Type</th>
                      <th className='px-4 py-3 font-medium'>Severity</th>
                      <th className='px-4 py-3 font-medium'>Status</th>
                      <th className='px-4 py-3 font-medium'></th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    {filteredAssertions.map((assertion) => (
                      <tr key={assertion.id} className={`hover:bg-surface transition-colors cursor-pointer ${selectedAssertion?.id === assertion.id ? 'bg-surface' : ''}`} onClick={() => selectAssertion(assertion)}>
                        <td className='px-4 py-4'>
                          <div className='font-medium text-text'>{assertion.name}</div>
                          <div className='text-xs text-text-secondary mt-1 line-clamp-1'>{assertion.description}</div>
                        </td>
                        <td className='px-4 py-4'>{getCategoryBadge(assertion.category)}</td>
                        <td className='px-4 py-4'>{getTypeBadge(assertion.type)}</td>
                        <td className='px-4 py-4'>{getSeverityBadge(assertion.severity)}</td>
                        <td className='px-4 py-4'>
                          <button onClick={(e) => { e.stopPropagation(); toggleAssertion({ id: assertion.id, enabled: !assertion.enabled }); }} className='flex items-center gap-1'>
                            {assertion.enabled ? <ToggleRight className='h-5 w-5 text-green-600' /> : <ToggleLeft className='h-5 w-5 text-gray-400' />}
                          </button>
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => duplicateAssertion(assertion.id)} title='Duplicate'>
                              <Copy className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => { setAssertionToDelete(assertion); setDeleteOpen(true); }} title='Delete'>
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAssertion && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Assertion Details</CardTitle>
                <div className='flex items-center gap-1'>
                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => toggleAssertion({ id: selectedAssertion.id, enabled: !selectedAssertion.enabled })} title={selectedAssertion.enabled ? 'Disable assertion' : 'Enable assertion'}>
                    {selectedAssertion.enabled ? <ToggleRight className='h-4 w-4 text-green-600' aria-hidden /> : <ToggleLeft className='h-4 w-4 text-gray-400' aria-hidden />}
                  </Button>
                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => duplicateAssertion(selectedAssertion.id)} title='Duplicate assertion'>
                    <Copy className='h-4 w-4' aria-hidden />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <h3 className='text-lg font-semibold text-text'>{selectedAssertion.name}</h3>
                <p className='text-sm text-text-secondary mt-1'>{selectedAssertion.description}</p>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Category</span>
                  {getCategoryBadge(selectedAssertion.category)}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Type</span>
                  {getTypeBadge(selectedAssertion.type)}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Severity</span>
                  {getSeverityBadge(selectedAssertion.severity)}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Status</span>
                  {selectedAssertion.enabled ? <Badge variant='success'>Enabled</Badge> : <Badge variant='secondary'>Disabled</Badge>}
                </div>
              </div>
              <div className='space-y-2'>
                <div>
                  <span className='text-sm font-medium text-text-secondary'>Expression</span>
                  <p className='text-sm text-text mt-1 font-mono bg-surface p-2 rounded'>{selectedAssertion.expression}</p>
                </div>
                <div>
                  <span className='text-sm font-medium text-text-secondary'>Expected Value</span>
                  <p className='text-sm text-text mt-1 font-mono bg-surface p-2 rounded'>{JSON.stringify(selectedAssertion.expectedValue)}</p>
                </div>
              </div>
              {selectedAssertion.tags.length > 0 && (
                <div>
                  <span className='text-sm font-medium text-text-secondary'>Tags</span>
                  <div className='flex flex-wrap gap-1 mt-2'>
                    {selectedAssertion.tags.map((tag) => (
                      <Badge key={tag} variant='outline' className='text-xs'>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className='ml-1'>
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {createOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='w-full max-w-lg'>
            <CardHeader>
              <CardTitle>Create Assertion</CardTitle>
              <CardDescription>Create a reusable assertion for test validation.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text'>Name *</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder='Assertion name' className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text' />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder='Assertion description' rows={3} className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text' />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-text'>Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as AssertionCategory })} className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'>
                    <option value='Functional'>Functional</option>
                    <option value='Performance'>Performance</option>
                    <option value='Security'>Security</option>
                    <option value='Data'>Data</option>
                    <option value='Business'>Business</option>
                    <option value='Custom'>Custom</option>
                  </select>
                </div>
                <div>
                  <label className='text-sm font-medium text-text'>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as AssertionType })} className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'>
                    <option value='HTTP Status'>HTTP Status</option>
                    <option value='Header Exists'>Header Exists</option>
                    <option value='Header Equals'>Header Equals</option>
                    <option value='JSON Path Exists'>JSON Path Exists</option>
                    <option value='JSON Path Equals'>JSON Path Equals</option>
                    <option value='Body Contains'>Body Contains</option>
                    <option value='Body Regex'>Body Regex</option>
                    <option value='Response Time'>Response Time</option>
                    <option value='Response Schema'>Response Schema</option>
                    <option value='Runtime Variable Exists'>Runtime Variable Exists</option>
                    <option value='Custom Assertion'>Custom Assertion</option>
                  </select>
                </div>
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Expression *</label>
                <input value={formData.expression} onChange={(e) => setFormData({ ...formData, expression: e.target.value })} placeholder='e.g., $.status, Content-Type, response.time' className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text' />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Expected Value</label>
                <input value={(formData.expectedValue as string) || ''} onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })} placeholder='Expected value' className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text' />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Tags</label>
                <div className='flex gap-2 mt-1'>
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder='Add tag' className='flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text' />
                  <Button type='button' size='sm' onClick={handleAddTag}>Add</Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className='flex flex-wrap gap-1 mt-2'>
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant='outline' className='text-xs'>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className='ml-1'>
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAssertion} disabled={!formData.name || !formData.expression}>Create Assertion</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog open={deleteOpen} title='Delete Assertion' message={`Deleting "${assertionToDelete?.name}" cannot be undone.`} confirmLabel='Delete' cancelLabel='Cancel' variant='destructive' onConfirm={handleDeleteAssertion} onCancel={() => { setDeleteOpen(false); setAssertionToDelete(undefined); }} />
    </div>
  );
};

export default AssertionLibraryPage;
