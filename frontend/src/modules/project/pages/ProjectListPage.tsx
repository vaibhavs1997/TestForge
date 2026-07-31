// Project list page with search, sort, and CRUD dialogs.
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { SearchBar } from '../../../components/shared/SearchBar';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DataTable } from '../../../components/tables/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ProjectDialog } from '../components/ProjectDialog';
import { useProject } from '../hooks/useProject';
import type { Project, ProjectFormData } from '../types';
import { FolderOpen } from 'lucide-react';

type SortField = 'name' | 'status' | 'createdDate' | 'updatedDate';
type SortDir = 'asc' | 'desc';

export const ProjectListPage = () => {
  const { projects, create, update, remove } = useProject();

  const [search, setSearch] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('updatedDate');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProject, setEditProject] = React.useState<Project | undefined>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteProject, setDeleteProject] = React.useState<Project | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = projects;
    if (term) {
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      );
    }
    data = [...data].sort((a, b) => {
      const side = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return side * a.name.localeCompare(b.name);
        case 'status':
          return side * a.status.localeCompare(b.status);
        case 'createdDate':
          return side * (new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
        case 'updatedDate':
          return side * (new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime());
        default:
          return 0;
      }
    });
    return data;
  }, [projects, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    setSortField((current) => {
      if (current === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir('asc');
      return field;
    });
  };

  const handleCreate = (data: ProjectFormData) => {
    create(data);
    setCreateOpen(false);
  };

  const handleUpdate = (data: ProjectFormData) => {
    if (editProject) {
      update(editProject.id, data);
      setEditOpen(false);
    }
  };

  const handleDelete = () => {
    if (deleteProject) {
      remove(deleteProject.id);
      setDeleteOpen(false);
    }
  };

  const columns = [
    {
      key: 'name' as const,
      header: 'Name',
      sortable: true as const,
      render: (project: Project) => (
        <div>
          <div className='font-medium text-text'>{project.name}</div>
          <div className='text-xs text-text-secondary'>{project.description}</div>
        </div>
      ),
    },
    {
      key: 'status' as const,
      header: 'Status',
      sortable: true as const,
      className: 'whitespace-nowrap',
      render: (project: Project) => (
        <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>{project.status}</Badge>
      ),
    },
    {
      key: 'createdDate' as const,
      header: 'Created Date',
      sortable: true as const,
      className: 'whitespace-nowrap',
      render: (project: Project) => new Date(project.createdDate).toLocaleDateString(),
    },
    {
      key: 'updatedDate' as const,
      header: 'Updated Date',
      sortable: true as const,
      className: 'whitespace-nowrap',
      render: (project: Project) => new Date(project.updatedDate).toLocaleDateString(),
    },
    {
      key: 'actions' as const,
      header: 'Actions',
      className: 'whitespace-nowrap',
      render: (project: Project) => (
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => { setEditProject(project); setEditOpen(true); }}>Edit</Button>
          <Button variant='destructive' size='sm' onClick={() => { setDeleteProject(project); setDeleteOpen(true); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <PageHeader
        title='Projects'
        description='Manage your testing projects and configurations.'
      >
        <Button onClick={() => setCreateOpen(true)}>Create Project</Button>
      </PageHeader>

      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <SearchBar value={search} onChange={setSearch} className='sm:w-80' />
        <div className='text-sm text-text-secondary'>{filtered.length} project{filtered.length !== 1 && 's'} found</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className='h-12 w-12' />}
          title={search ? 'No matching projects' : 'No projects yet'}
          description={
            search
              ? 'Try adjusting your search criteria.'
              : 'Create your first project to get started.'
          }
          action={
            search
              ? undefined
              : {
                label: 'Create Project',
                onClick: () => setCreateOpen(true),
              }
          }
        />
      ) : (
        <DataTable
          columns={columns as never[]}
          data={filtered as never[]}
          emptyMessage='No projects found.'
          className='rounded-lg border border-border'
        />
      )}

      {filtered.length > 0 && (
        <div className='mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-xs text-text-secondary'>Click column headers to sort</div>
          <div className='flex flex-wrap gap-2'>
            {(Object.entries({
              Name: 'name',
              Status: 'status',
              Created: 'createdDate',
              Updated: 'updatedDate',
            }) as [string, SortField][]).map(([label, field]) => (
              <Button
                key={field}
                variant={sortField === field ? 'default' : 'outline'}
                onClick={() => handleSort(field)}
              >
                {label} ({sortField === field ? (sortDir === 'asc' ? 'asc' : 'desc') : ''})
              </Button>
            ))}
          </div>
        </div>
      )}

      <ProjectDialog
        open={createOpen}
        mode='create'
        onSubmit={handleCreate}
        onCancel={() => setCreateOpen(false)}
      />

      <ProjectDialog
        open={editOpen}
        mode='edit'
        project={editProject}
        onSubmit={handleUpdate}
        onCancel={() => setEditOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Project'
        message={`Deleting "${deleteProject?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

export default ProjectListPage;