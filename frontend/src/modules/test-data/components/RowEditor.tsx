// RowEditor - Spreadsheet-style editor for Dataset Rows
import React from 'react';
import { Plus, Copy, Trash2, Search, ChevronLeft, ChevronRight, Upload, Wand2, Check, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/shared/SearchBar';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Toast } from '../../../components/shared/Toast';
import { useRows } from '../hooks/useRows';
import type { ColumnInfo, DatasetRow } from '../types';

export interface RowEditorProps {
  projectId: string;
  datasetId: string;
  columns: ColumnInfo[];
  setToastMessage: (v: string) => void;
  setToastOpen: (v: boolean) => void;
}

const PAGE_SIZE = 10;

export const RowEditor: React.FC<RowEditorProps> = ({
  projectId,
  datasetId,
  columns,
  setToastMessage,
  setToastOpen,
}) => {
  const { rows, isLoading, createAsync, updateAsync, removeAsync } = useRows(projectId, datasetId);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; column: string } | null>(null);
  const [cellValue, setCellValue] = React.useState('');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [rowToDelete, setRowToDelete] = React.useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const filteredRows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row.values).some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const validateRow = (values: Record<string, any>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    for (const col of columns) {
      const value = values[col.name];
      if (col.required && (value === undefined || value === null || value === '')) {
        newErrors[col.name] = `${col.displayName} is required`;
      }
      if (col.unique && value !== undefined && value !== '') {
        const duplicate = rows.some((r) => r.values[col.name] === value);
        if (duplicate) {
          newErrors[col.name] = `${col.displayName} must be unique`;
        }
      }
    }
    return newErrors;
  };

  const handleAddRow = async () => {
    const emptyValues: Record<string, any> = {};
    for (const col of columns) {
      emptyValues[col.name] = '';
    }
    try {
      await createAsync({ projectId, datasetId, values: emptyValues });
      setToastMessage('Row added successfully');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to add row');
      setToastOpen(true);
    }
  };

  const handleDuplicateRow = async (row: DatasetRow) => {
    try {
      await createAsync({ projectId, datasetId, values: { ...row.values } });
      setToastMessage('Row duplicated successfully');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to duplicate row');
      setToastOpen(true);
    }
  };

  const handleCellClick = (row: DatasetRow, column: string) => {
    setEditingCell({ rowId: row.id, column });
    setCellValue(row.values[column] ?? '');
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCellValue(e.target.value);
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;
    const { rowId, column } = editingCell;
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const newValues = { ...row.values, [column]: cellValue };
    const validationErrors = validateRow(newValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setEditingCell(null);
      return;
    }

    try {
      await updateAsync({ rowId, values: newValues });
      setErrors({});
      setToastMessage('Cell updated');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to update cell');
      setToastOpen(true);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleDeleteRow = async () => {
    if (!rowToDelete) return;
    try {
      await removeAsync(rowToDelete);
      setToastMessage('Row deleted successfully');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to delete row');
      setToastOpen(true);
    }
    setDeleteOpen(false);
    setRowToDelete(null);
  };

  const handleBulkDelete = async () => {
    try {
      for (const rowId of selectedRows) {
        await removeAsync(rowId);
      }
      setToastMessage(`${selectedRows.size} rows deleted successfully`);
      setToastOpen(true);
      setSelectedRows(new Set());
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to delete rows');
      setToastOpen(true);
    }
    setBulkDeleteOpen(false);
  };

  const toggleRowSelection = (rowId: string) => {
    const next = new Set(selectedRows);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRows(next);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === pagedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pagedRows.map((r) => r.id)));
    }
  };

  const handleCopyPaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text || !editingCell) return;
    e.preventDefault();
    setCellValue(text);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <p className='text-sm text-text-secondary'>Loading rows...</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={handleAddRow}>
            <Plus className='mr-1 h-4 w-4' />
            Add Row
          </Button>
          <Button size='sm' variant='outline' onClick={() => handleDuplicateRow(rows[0])} disabled={rows.length === 0}>
            <Copy className='mr-1 h-4 w-4' />
            Duplicate
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setBulkDeleteOpen(true)}
            disabled={selectedRows.size === 0}
          >
            <Trash2 className='mr-1 h-4 w-4' />
            Delete ({selectedRows.size})
          </Button>
          <Button size='sm' variant='outline' disabled>
            <Upload className='mr-1 h-4 w-4' />
            Import
          </Button>
          <Button size='sm' variant='outline' disabled>
            <Wand2 className='mr-1 h-4 w-4' />
            Generate
          </Button>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder='Search rows...' className='w-64' />
      </div>

      {/* Spreadsheet Table */}
      {pagedRows.length === 0 ? (
        <EmptyState
          icon={<Search className='h-12 w-12' />}
          title={search ? 'No matching rows' : 'No data yet'}
          description={search ? 'Try adjusting your search criteria.' : 'Add your first row to start populating this dataset.'}
          action={search ? undefined : { label: 'Add Row', onClick: handleAddRow }}
        />
      ) : (
        <Card>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='border-b border-border bg-surface'>
                <tr>
                  <th className='w-10 px-2 py-3'>
                    <input
                      type='checkbox'
                      checked={selectedRows.size === pagedRows.length && pagedRows.length > 0}
                      onChange={toggleAllSelection}
                      className='h-4 w-4 rounded border-border'
                      aria-label='Select all rows'
                    />
                  </th>
                  <th className='w-12 px-2 py-3 text-left text-xs font-medium text-text-secondary'>#</th>
                  {columns.map((col) => (
                    <th key={col.name} className='px-3 py-3 text-left'>
                      <div className='flex items-center gap-1'>
                        <span className='text-xs font-medium text-text'>{col.displayName}</span>
                        {col.required && <Badge variant='destructive' className='text-[10px]'>Req</Badge>}
                        {col.unique && <Badge variant='secondary' className='text-[10px]'>Unique</Badge>}
                      </div>
                      <span className='font-mono text-[10px] text-text-secondary'>{col.name}</span>
                    </th>
                  ))}
                  <th className='w-20 px-2 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, rowIndex) => (
                  <tr key={row.id} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                    <td className='px-2 py-2'>
                      <input
                        type='checkbox'
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className='h-4 w-4 rounded border-border'
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </td>
                    <td className='px-2 py-2 text-xs text-text-secondary'>
                      {(currentPage - 1) * PAGE_SIZE + rowIndex + 1}
                    </td>
                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.column === col.name;
                      const error = errors[col.name];
                      return (
                        <td key={col.name} className='px-3 py-2'>
                          {isEditing ? (
                            <input
                              type='text'
                              value={cellValue}
                              onChange={handleCellChange}
                              onBlur={handleCellBlur}
                              onKeyDown={handleCellKeyDown}
                              onPaste={handleCopyPaste}
                              autoFocus
                              className={`w-full rounded border px-2 py-1 text-sm ${
                                error ? 'border-error' : 'border-border'
                              } focus:outline-none focus:ring-2 focus:ring-primary`}
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(row, col.name)}
                              className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-primary/5 ${
                                error ? 'text-error' : 'text-text'
                              }`}
                            >
                              {row.values[col.name] ?? ''}
                            </button>
                          )}
                          {error && !isEditing && (
                            <p className='mt-1 text-[10px] text-error'>{error}</p>
                          )}
                        </td>
                      );
                    })}
                    <td className='px-2 py-2'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='sm' onClick={() => handleDuplicateRow(row)} aria-label='Duplicate row'>
                          <Copy className='h-3 w-3' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => { setRowToDelete(row.id); setDeleteOpen(true); }}
                          aria-label='Delete row'
                        >
                          <Trash2 className='h-3 w-3 text-error' />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <p className='text-xs text-text-secondary'>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} rows
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='text-xs text-text-secondary'>Page {currentPage} of {totalPages}</span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Row'
        message='Deleting this row cannot be undone.'
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDeleteRow}
        onCancel={() => { setDeleteOpen(false); setRowToDelete(null); }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title='Delete Selected Rows'
        message={`Deleting ${selectedRows.size} rows cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
};

export default RowEditor;