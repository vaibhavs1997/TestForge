// ExecutionProfilePage - Manage Execution Profiles

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/shared/SearchBar';
import { Toast } from '../../../components/shared/Toast';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { isPositiveNumber, FormErrors } from '../../../utils/validation';
import { Settings, Plus, Edit, Trash2, Copy, Check, X, Zap } from 'lucide-react';
import { profileService } from '../services/profileService';
import type { ExecutionProfile, CreateProfileInput } from '../types/profile';
import { logger } from '../../../utils/logger';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';
import { projectStore } from '../../../store/projectStore';

export const ExecutionProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((s) => s.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId ?? '1';
  const [profiles, setProfiles] = React.useState<ExecutionProfile[]>([]);
  const [search, setSearch] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<ExecutionProfile | null>(null);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfiles = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await profileService.listByProject(projectId);
      setProfiles(data);
    } catch (err) {
      logger.error('Failed to load execution profiles', err);
      setError('Failed to load profiles');
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load profiles on mount
  React.useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const filteredProfiles = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.tags.some(t => t.toLowerCase().includes(term))
    );
  }, [search, profiles]);

  const handleCreate = () => {
    setSelectedProfile(null);
    setDialogOpen(true);
  };

  const handleEdit = (profile: ExecutionProfile) => {
    setSelectedProfile(profile);
    setDialogOpen(true);
  };

  const handleDelete = (profile: ExecutionProfile) => {
    setSelectedProfile(profile);
    setDeleteOpen(true);
  };

  const handleDuplicate = async (profile: ExecutionProfile) => {
    try {
      const newName = `${profile.name} Copy`;
      const duplicated = await profileService.duplicate(projectId, profile.id, newName);
      setProfiles([...profiles, duplicated]);
      setToastMessage('Profile duplicated successfully');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to duplicate profile', err);
      setToastMessage('Failed to duplicate profile');
      setToastOpen(true);
    }
  };

  const handleToggleEnabled = async (profile: ExecutionProfile) => {
    try {
      const updated = await profileService.update(projectId, profile.id, { enabled: !profile.enabled });
      setProfiles(profiles.map(p => (p.id === profile.id ? updated : p)));
      setToastMessage(`Profile ${!profile.enabled ? 'enabled' : 'disabled'}`);
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to toggle profile', err);
      setToastMessage('Failed to update profile');
      setToastOpen(true);
    }
  };

  const handleSetDefault = async (profile: ExecutionProfile) => {
    try {
      const updated = await profileService.update(projectId, profile.id, { isDefault: true });
      setProfiles(profiles.map(p => (p.id === profile.id ? updated : { ...p, isDefault: false })));
      setToastMessage('Default profile updated');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to set default profile', err);
      setToastMessage('Failed to set default profile');
      setToastOpen(true);
    }
  };

  const handleSave = async (input: CreateProfileInput) => {
    setIsSubmitting(true);
    try {
      if (selectedProfile) {
        const updated = await profileService.update(projectId, selectedProfile.id, input);
        setProfiles(profiles.map(p => (p.id === selectedProfile.id ? updated : p)));
      } else {
        const created = await profileService.create(projectId, input);
        setProfiles([...profiles, created]);
      }
      setDialogOpen(false);
      setToastMessage(selectedProfile ? 'Profile updated successfully' : 'Profile created successfully');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to save profile', err);
      setToastMessage('Failed to save profile');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProfile) return;
    try {
      await profileService.delete(projectId, selectedProfile.id);
      setProfiles(profiles.filter(p => p.id !== selectedProfile.id));
      setToastMessage('Profile deleted successfully');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to delete profile', err);
      setToastMessage('Failed to delete profile');
      setToastOpen(true);
    } finally {
      setDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-text'>Execution Profiles</h1>
          <p className='mt-1 text-sm text-text-secondary'>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && profiles.length === 0) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-text'>Execution Profiles</h1>
        </div>
        <ErrorAlert
          title='Failed to load execution profiles'
          message={error}
          onRetry={loadProfiles}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <WorkflowOptionalBanner
        projectId={projectId}
        description="Profiles control timeouts, retries, and parallelism. Default settings work for most requirement-based runs."
        primaryLink={{
          label: 'Back to runs',
          path: `/projects/${projectId}/execution`,
        }}
      />

      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Execution profiles</h1>
          <p className='mt-1 text-sm text-text-secondary'>Advanced run settings — optional unless you need custom retry or timeout behavior.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className='mr-2 h-4 w-4' />
          New Profile
        </Button>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search profiles...' className='sm:w-80' />
      </div>

      {/* Empty State */}
      {filteredProfiles.length === 0 && (
        <EmptyState
          icon={<Settings className='h-12 w-12' />}
          title='No execution profiles'
          description='Profiles use sensible defaults when you run from Requirements. Add one only if you need different timeout or retry rules.'
          action={{ label: 'Create profile', onClick: handleCreate }}
          secondaryAction={{
            label: 'Run tests',
            onClick: () => navigate(`/projects/${projectId}/execution`),
          }}
        />
      )}

      {/* Profile Cards */}
      {filteredProfiles.length > 0 && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className='transition-shadow hover:shadow-lg'>
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <Settings className='h-5 w-5 text-primary' />
                    <div>
                      <CardTitle className='text-base'>{profile.name}</CardTitle>
                      <div className='mt-1 flex items-center gap-1'>
                        {profile.isDefault && <Badge variant='default' className='text-xs'>Default</Badge>}
                        <Badge variant={profile.enabled ? 'success' : 'secondary'} className='text-xs'>
                          {profile.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <p className='text-xs text-text-secondary'>{profile.description}</p>

                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Failure Mode</span>
                      <span className='font-medium text-text'>{profile.failureMode}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Timeout</span>
                      <span className='font-medium text-text'>{profile.timeout}ms</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Assertion Mode</span>
                      <span className='font-medium text-text'>{profile.assertionMode}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Dataset Strategy</span>
                      <span className='font-medium text-text'>{profile.datasetSelectionStrategy}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-text-secondary'>Runtime Reset</span>
                      <span className='font-medium text-text'>{profile.runtimeVariableReset ? 'Yes' : 'No'}</span>
                    </div>
                    {profile.retryPolicy.enabled && (
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-text-secondary'>Retry</span>
                        <span className='font-medium text-text'>{profile.retryPolicy.maxRetries}x / {profile.retryPolicy.retryDelay}ms</span>
                      </div>
                    )}
                  </div>

                  {profile.tags.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {profile.tags.map((tag) => (
                        <Badge key={tag} variant='outline' className='text-xs'>{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className='flex gap-1 pt-2'>
                    <Button variant='outline' size='sm' className='flex-1' onClick={() => handleEdit(profile)}>
                      <Edit className='mr-1 h-3 w-3' />
                      Edit
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => handleDuplicate(profile)} title='Duplicate'>
                      <Copy className='h-3 w-3' />
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => handleToggleEnabled(profile)} title={profile.enabled ? 'Disable' : 'Enable'}>
                      {profile.enabled ? <X className='h-3 w-3' /> : <Check className='h-3 w-3' />}
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => handleSetDefault(profile)} title='Set as Default' disabled={profile.isDefault}>
                      <Zap className='h-3 w-3' />
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => handleDelete(profile)} title='Delete' disabled={profile.isDefault}>
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Profile Dialog */}
      {dialogOpen && (
        <ProfileDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSave}
          profile={selectedProfile || undefined}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Profile'
        message={`Deleting "${selectedProfile?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Toast */}
      <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
};

// Profile Dialog Component
interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProfileInput) => void;
  profile?: ExecutionProfile;
  isSubmitting?: boolean;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ open, onClose, onSubmit, profile, isSubmitting = false }) => {
  const [formData, setFormData] = React.useState<CreateProfileInput>({
    name: profile?.name || '',
    description: profile?.description || '',
    defaultEnvironmentId: profile?.defaultEnvironmentId || '',
    failureMode: profile?.failureMode || 'StopOnFailure',
    retryPolicy: profile?.retryPolicy || { enabled: false, maxRetries: 3, retryDelay: 1000 },
    timeout: profile?.timeout || 30000,
    parallelism: profile?.parallelism || { enabled: false, maxConcurrent: 1 },
    assertionMode: profile?.assertionMode || 'all',
    runtimeVariableReset: profile?.runtimeVariableReset ?? true,
    datasetSelectionStrategy: profile?.datasetSelectionStrategy || 'first',
    tags: profile?.tags || [],
    enabled: profile?.enabled ?? true,
    isDefault: profile?.isDefault ?? false,
  });

  const [tagInput, setTagInput] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        description: profile.description,
        defaultEnvironmentId: profile.defaultEnvironmentId,
        failureMode: profile.failureMode,
        retryPolicy: profile.retryPolicy,
        timeout: profile.timeout,
        parallelism: profile.parallelism,
        assertionMode: profile.assertionMode,
        runtimeVariableReset: profile.runtimeVariableReset,
        datasetSelectionStrategy: profile.datasetSelectionStrategy,
        tags: profile.tags,
        enabled: profile.enabled,
        isDefault: profile.isDefault,
      });
    }
    setFormErrors({});
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!isPositiveNumber(formData.timeout)) {
      newErrors.timeout = 'Timeout must be greater than 0';
    }
    if (formData.retryPolicy.enabled) {
      if (formData.retryPolicy.maxRetries < 0) {
        newErrors.maxRetries = 'Max retries must be 0 or greater';
      }
      if (formData.retryPolicy.retryDelay < 0) {
        newErrors.retryDelay = 'Retry delay must be 0 or greater';
      }
    }
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    onSubmit(formData);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{profile ? 'Edit Profile' : 'Create Profile'}</h2>
          <Button variant='ghost' size='sm' onClick={onClose} aria-label="Close">✕</Button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Name */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Name</label>
            <input
              type='text'
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: undefined })); }}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.name ? 'border-error' : 'border-border'}`}
              required
              aria-invalid={formErrors.name ? 'true' : undefined}
            />
            {formErrors.name && <p className='text-sm text-error' role='alert'>{formErrors.name}</p>}
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              rows={2}
            />
          </div>

          {/* Failure Mode */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Failure Mode</label>
            <select
              value={formData.failureMode}
              onChange={(e) => setFormData({ ...formData, failureMode: e.target.value as any })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
            >
              <option value='StopOnFailure'>Stop on Failure</option>
              <option value='ContinueOnFailure'>Continue on Failure</option>
            </select>
          </div>

          {/* Timeout */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Timeout (ms)</label>
            <input
              type='number'
              value={formData.timeout}
              onChange={(e) => { setFormData({ ...formData, timeout: Number(e.target.value) }); setFormErrors(prev => ({ ...prev, timeout: undefined })); }}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${formErrors.timeout ? 'border-error' : 'border-border'}`}
              aria-invalid={formErrors.timeout ? 'true' : undefined}
            />
            {formErrors.timeout && <p className='text-sm text-error' role='alert'>{formErrors.timeout}</p>}
          </div>

          {/* Assertion Mode */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Assertion Mode</label>
            <select
              value={formData.assertionMode}
              onChange={(e) => setFormData({ ...formData, assertionMode: e.target.value as any })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
            >
              <option value='all'>Run All</option>
              <option value='failFast'>Fail Fast</option>
              <option value='skipOnFailure'>Skip on Failure</option>
            </select>
          </div>

          {/* Dataset Selection Strategy */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Dataset Selection Strategy</label>
            <select
              value={formData.datasetSelectionStrategy}
              onChange={(e) => setFormData({ ...formData, datasetSelectionStrategy: e.target.value as any })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
            >
              <option value='first'>First Row</option>
              <option value='random'>Random Row</option>
              <option value='sequential'>Sequential Row</option>
            </select>
          </div>

          {/* Runtime Variable Reset */}
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='runtimeReset'
              checked={formData.runtimeVariableReset}
              onChange={(e) => setFormData({ ...formData, runtimeVariableReset: e.target.checked })}
              className='h-4 w-4 rounded border-border'
            />
            <label htmlFor='runtimeReset' className='text-sm'>Reset Runtime Variables Before Execution</label>
          </div>

          {/* Retry Policy */}
          <div className='space-y-2 border border-border rounded-lg p-3'>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id='retryEnabled'
                checked={formData.retryPolicy.enabled}
                onChange={(e) => setFormData({ ...formData, retryPolicy: { ...formData.retryPolicy, enabled: e.target.checked } })}
                className='h-4 w-4 rounded border-border'
              />
              <label htmlFor='retryEnabled' className='text-sm font-medium'>Retry Policy</label>
            </div>
            {formData.retryPolicy.enabled && (
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-xs text-text-secondary'>Max Retries</label>
                  <input
                    type='number'
                    value={formData.retryPolicy.maxRetries}
                    onChange={(e) => setFormData({ ...formData, retryPolicy: { ...formData.retryPolicy, maxRetries: Number(e.target.value) } })}
                    className='w-full rounded-lg border border-border px-3 py-1.5 text-sm'
                  />
                </div>
                <div>
                  <label className='text-xs text-text-secondary'>Retry Delay (ms)</label>
                  <input
                    type='number'
                    value={formData.retryPolicy.retryDelay}
                    onChange={(e) => setFormData({ ...formData, retryPolicy: { ...formData.retryPolicy, retryDelay: Number(e.target.value) } })}
                    className='w-full rounded-lg border border-border px-3 py-1.5 text-sm'
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Tags</label>
            <div className='flex gap-2'>
              <input
                type='text'
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder='Add tag...'
                className='flex-1 rounded-lg border border-border px-3 py-2 text-sm'
              />
              <Button type='button' variant='outline' size='sm' onClick={handleAddTag}>Add</Button>
            </div>
            {formData.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant='secondary' className='text-xs cursor-pointer' onClick={() => handleRemoveTag(tag)}>
                    {tag} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Default Profile */}
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='isDefault'
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className='h-4 w-4 rounded border-border'
            />
            <label htmlFor='isDefault' className='text-sm'>Set as Default Profile</label>
          </div>

          {/* Actions */}
          <div className='flex justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={onClose}>Cancel</Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : profile ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExecutionProfilePage;
