// SchedulerPage - Manage scheduled executions of Test Suites
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import { Switch } from '../../../components/forms/Switch';
import { useSchedules } from '../hooks';
import { useSuites } from '../../suite/hooks';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { profileService } from '../../execution/services/profileService';
import { projectStore } from '../../../store/projectStore';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { validateCron, FormErrors } from '../../../utils/validation';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { ProjectContextMissing } from '../../../components/shared/ProjectContextMissing';
import type { Schedule, ScheduleFormData, ScheduleStatus } from '../types';
import type { TestSuite } from '../../suite/types';
import type { ExecutionProfile } from '../../execution/types/profile';
import { CalendarClock, Plus, Copy, Trash2, Play, Power, Pencil, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Australia/Melbourne',
];

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every Sunday at midnight', value: '0 0 * * 0' },
];

export const SchedulerPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId;
  if (!projectId) return <ProjectContextMissing />;
  return <SchedulerPageContent navigate={navigate} projectId={projectId} />;
};

const SchedulerPageContent: React.FC<{ projectId: string; navigate: ReturnType<typeof useNavigate> }> = ({ projectId, navigate }) => {
  const { schedules, isLoading, create, update, remove, runNow, enable, disable } = useSchedules(projectId);

  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: 'Schedules' },
  ];
  const { suites } = useSuites(projectId);
  const { environments } = useEnvironments(projectId);

  const [search, setSearch] = React.useState('');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<Schedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = React.useState<Schedule | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [profiles, setProfiles] = React.useState<ExecutionProfile[]>([]);

  // Editor form state
  const [formName, setFormName] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formSuiteId, setFormSuiteId] = React.useState('');
  const [formProfileId, setFormProfileId] = React.useState('');
  const [formEnvironmentId, setFormEnvironmentId] = React.useState('');
  const [formCron, setFormCron] = React.useState('');
  const [formTimezone, setFormTimezone] = React.useState('UTC');
  const [formEnabled, setFormEnabled] = React.useState(true);
  const [formError, setFormError] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});

  // Load profiles
  React.useEffect(() => {
    profileService.listByProject(projectId).then(setProfiles).catch(() => setProfiles([]));
  }, [projectId]);

  const filteredSchedules = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return schedules.filter((schedule) => {
      const matchesSearch =
        !term ||
        schedule.name.toLowerCase().includes(term) ||
        schedule.description.toLowerCase().includes(term) ||
        schedule.cronExpression.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [search, schedules]);

  const getStatusBadge = (status: ScheduleStatus | null) => {
    if (!status) return <Badge variant='outline'>Never</Badge>;
    const variants: Record<ScheduleStatus, 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
      'idle': 'secondary',
      'running': 'warning',
      'passed': 'success',
      'failed': 'destructive',
      'skipped': 'outline',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: ScheduleStatus | null) => {
    if (!status) return <Clock className='h-4 w-4 text-text-secondary' />;
    switch (status) {
      case 'passed': return <CheckCircle2 className='h-4 w-4 text-green-500' />;
      case 'failed': return <XCircle className='h-4 w-4 text-red-500' />;
      case 'running': return <Loader2 className='h-4 w-4 text-yellow-500 animate-spin' />;
      case 'skipped': return <AlertCircle className='h-4 w-4 text-text-secondary' />;
      default: return <Clock className='h-4 w-4 text-text-secondary' />;
    }
  };

  const getSuiteName = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite?.name || suiteId;
  };

  const getProfileName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.name || profileId;
  };

  const getEnvironmentName = (envId: string | null) => {
    if (!envId) return 'Default';
    const env = environments.find(e => e.id === envId);
    return env?.name || envId;
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  const openCreateEditor = () => {
    setEditingSchedule(null);
    setFormName('');
    setFormDescription('');
    setFormSuiteId('');
    setFormProfileId('');
    setFormEnvironmentId('');
    setFormCron('0 9 * * *');
    setFormTimezone('UTC');
    setFormEnabled(true);
    setFormError('');
    setFormErrors({});
    setEditorOpen(true);
  };

  const openEditEditor = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormName(schedule.name);
    setFormDescription(schedule.description);
    setFormSuiteId(schedule.suiteId);
    setFormProfileId(schedule.executionProfileId);
    setFormEnvironmentId(schedule.environmentId || '');
    setFormCron(schedule.cronExpression);
    setFormTimezone(schedule.timezone);
    setFormEnabled(schedule.enabled);
    setFormError('');
    setFormErrors({});
    setEditorOpen(true);
  };

  const handleSave = () => {
    const newErrors: FormErrors = {};
    if (!formName.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formSuiteId) {
      newErrors.suiteId = 'Test Suite is required';
    }
    if (!formProfileId) {
      newErrors.profileId = 'Execution Profile is required';
    }
    const cronResult = validateCron(formCron);
    if (!cronResult.valid) {
      newErrors.cron = cronResult.message;
    }
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const payload: ScheduleFormData = {
      name: formName,
      description: formDescription,
      suiteId: formSuiteId,
      executionProfileId: formProfileId,
      environmentId: formEnvironmentId || null,
      cronExpression: formCron,
      timezone: formTimezone,
      enabled: formEnabled,
    };

    if (editingSchedule) {
      update({ projectId, scheduleId: editingSchedule.id, ...payload });
    } else {
      create({ projectId, ...payload });
    }

    setEditorOpen(false);
  };

  const handleDuplicate = (schedule: Schedule) => {
    const payload: ScheduleFormData = {
      name: `${schedule.name} (Copy)`,
      description: schedule.description,
      suiteId: schedule.suiteId,
      executionProfileId: schedule.executionProfileId,
      environmentId: schedule.environmentId,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      enabled: false,
    };
    create({ projectId, ...payload });
  };

  const handleDelete = () => {
    if (!deleteSchedule) return;
    remove({ projectId, scheduleId: deleteSchedule.id });
    setDeleteOpen(false);
    setDeleteSchedule(undefined);
  };

  const handleToggle = (schedule: Schedule) => {
    if (schedule.enabled) {
      disable({ projectId, scheduleId: schedule.id });
    } else {
      enable({ projectId, scheduleId: schedule.id });
    }
  };

  const handleRunNow = (schedule: Schedule) => {
    runNow({ projectId, scheduleId: schedule.id });
  };

  const activeSuites = React.useMemo(() => suites.filter(s => s.status === 'Active'), [suites]);

  const [queryError] = React.useState<string | null>(null);

  if (queryError) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <ErrorAlert
          title='Failed to load schedules'
          message={queryError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <WorkflowOptionalBanner
        projectId={projectId}
        description="Cron-based suite runs for CI or nightly checks. Manual runs from Requirements or Execution do not need a schedule."
        primaryLink={{
          label: 'Manage suites',
          path: `/projects/${projectId}/execution/suites`,
        }}
      />

      {/* Page Header */}
      <div className='mb-6'>
        <nav className='flex items-center gap-2 text-sm text-text-secondary'>
          {breadcrumbItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {item.to ? (
                <a href={item.to} className='hover:text-text'>{item.label}</a>
              ) : (
                <span className='text-text'>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <div className='mt-4 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Scheduled runs</h1>
            <p className='mt-1 text-sm text-text-secondary'>Automate test suites on a cron — optional after you have suites and stable environments.</p>
          </div>
          <div className='flex items-center gap-3'>
            <SearchBar value={search} onChange={setSearch} placeholder='Search schedules...' className='sm:w-80' />
            <Button onClick={openCreateEditor}>
              <Plus className='mr-2 h-4 w-4' />
              Create Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <Card>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-8 text-center text-text-secondary'>Loading schedules...</div>
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className='h-12 w-12' />}
              title={search ? 'No matching schedules' : 'No schedules yet'}
              description={search ? 'Try adjusting your search criteria.' : 'Create a schedule when you need recurring suite runs (e.g. nightly staging).'}
              action={search ? undefined : { label: 'Create schedule', onClick: openCreateEditor }}
              secondaryAction={
                search
                  ? undefined
                  : {
                      label: 'Run tests now',
                      onClick: () => navigate(`/projects/${projectId}/execution`),
                    }
              }
            />
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-sm text-text-secondary'>
                    <th className='px-4 py-3 font-medium'>Schedule</th>
                    <th className='px-4 py-3 font-medium'>Suite</th>
                    <th className='px-4 py-3 font-medium'>Profile</th>
                    <th className='px-4 py-3 font-medium'>Cron</th>
                    <th className='px-4 py-3 font-medium'>Next Run</th>
                    <th className='px-4 py-3 font-medium'>Last Run</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Enabled</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule.id} className='hover:bg-surface transition-colors'>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-3'>
                          <div className='h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
                            <CalendarClock className='h-4 w-4 text-blue-600' />
                          </div>
                          <div>
                            <div className='font-medium text-text'>{schedule.name}</div>
                            <div className='text-xs text-text-secondary line-clamp-1'>{schedule.description || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-4 text-sm text-text'>{getSuiteName(schedule.suiteId)}</td>
                      <td className='px-4 py-4 text-sm text-text'>{getProfileName(schedule.executionProfileId)}</td>
                      <td className='px-4 py-4'>
                        <code className='rounded bg-surface px-2 py-1 text-xs text-text'>{schedule.cronExpression}</code>
                        <div className='text-xs text-text-secondary mt-1'>{schedule.timezone}</div>
                      </td>
                      <td className='px-4 py-4 text-sm text-text-secondary'>{formatDate(schedule.nextRun)}</td>
                      <td className='px-4 py-4 text-sm text-text-secondary'>{formatDate(schedule.lastRun)}</td>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-2'>
                          {getStatusIcon(schedule.lastStatus)}
                          {getStatusBadge(schedule.lastStatus)}
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <Switch
                          checked={schedule.enabled}
                          onChange={() => handleToggle(schedule)}
                          aria-label={`Toggle ${schedule.name}`}
                        />
                      </td>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-1'>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => handleRunNow(schedule)} title='Run Now' disabled={!schedule.enabled}>
                            <Play className='h-4 w-4' />
                          </Button>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => openEditEditor(schedule)} title='Edit'>
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => handleDuplicate(schedule)} title='Duplicate'>
                            <Copy className='h-4 w-4' />
                          </Button>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => { setDeleteSchedule(schedule); setDeleteOpen(true); }} title='Delete'>
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

      {/* Schedule Editor Modal */}
      {editorOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <CardHeader>
              <CardTitle>{editingSchedule ? 'Edit Schedule' : 'Create Schedule'}</CardTitle>
              <CardDescription>Configure when a test suite should execute automatically.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {formError && (
                <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600'>
                  {formError}
                </div>
              )}

              {/* General */}
              <div>
                <h3 className='text-sm font-semibold text-text mb-3'>General</h3>
                <div className='space-y-4'>
                  <TextInput
                    label='Name'
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({ ...prev, name: undefined })); }}
                    placeholder='Nightly Regression'
                    error={formErrors.name}
                    required
                  />
                  <TextArea
                    label='Description'
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder='Describe the purpose of this schedule'
                    rows={2}
                  />
                </div>
              </div>

              {/* Execution */}
              <div>
                <h3 className='text-sm font-semibold text-text mb-3'>Execution</h3>
                <div className='space-y-4'>
                  <Select
                    label='Test Suite'
                    value={formSuiteId}
                    onChange={(e) => { setFormSuiteId(e.target.value); setFormErrors(prev => ({ ...prev, suiteId: undefined })); }}
                    placeholder='Select a test suite'
                    options={activeSuites.map((suite: TestSuite) => ({
                      value: suite.id,
                      label: suite.name,
                    }))}
                    error={formErrors.suiteId}
                    helperText={activeSuites.length === 0 ? 'No active test suites available. Activate a suite first.' : undefined}
                    required
                  />
                  <Select
                    label='Execution Profile'
                    value={formProfileId}
                    onChange={(e) => { setFormProfileId(e.target.value); setFormErrors(prev => ({ ...prev, profileId: undefined })); }}
                    placeholder='Select an execution profile'
                    options={profiles.map((profile) => ({
                      value: profile.id,
                      label: profile.name,
                    }))}
                    error={formErrors.profileId}
                    required
                  />
                  <Select
                    label='Environment Override (optional)'
                    value={formEnvironmentId}
                    onChange={(e) => setFormEnvironmentId(e.target.value)}
                    placeholder='Use default environment'
                    options={environments.map((env) => ({
                      value: env.id,
                      label: env.name,
                    }))}
                    helperText='Leave empty to use the suite or profile default environment.'
                  />
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h3 className='text-sm font-semibold text-text mb-3'>Schedule</h3>
                <div className='space-y-4'>
                  <div>
                    <label className='text-sm font-medium text-text'>Cron Expression *</label>
                    <div className='mt-1 flex gap-2'>
                      <TextInput
                        value={formCron}
                        onChange={(e) => { setFormCron(e.target.value); setFormErrors(prev => ({ ...prev, cron: undefined })); }}
                        placeholder='0 9 * * *'
                        className='flex-1'
                        error={formErrors.cron}
                        required
                      />
                      <Select
                        value=''
                        onChange={(e) => { if (e.target.value) setFormCron(e.target.value); }}
                        placeholder='Presets'
                        options={CRON_PRESETS.map(p => ({ value: p.value, label: p.label }))}
                        className='w-48'
                      />
                    </div>
                    <p className='mt-1 text-xs text-text-secondary'>
                      Format: minute hour day-of-month month day-of-week (e.g., 0 9 * * 1 = every Monday at 9am)
                    </p>
                  </div>
                  <Select
                    label='Timezone'
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
                  />
                  <div className='flex items-center justify-between rounded-lg border border-border p-3'>
                    <div>
                      <div className='text-sm font-medium text-text'>Enabled</div>
                      <div className='text-xs text-text-secondary'>Schedule will execute automatically when enabled.</div>
                    </div>
                    <Switch
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      label=''
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setEditorOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>
                  {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Schedule'
        message={`Deleting "${deleteSchedule?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteSchedule(undefined); }}
      />
    </div>
  );
};

export default SchedulerPage;
