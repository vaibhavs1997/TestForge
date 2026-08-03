// DataTabContent - Spreadsheet-style row editor for the Data tab
import React from 'react';
import { RowEditor } from './RowEditor';
import type { ColumnInfo } from '../types';

export interface DataTabContentProps {
  projectId: string;
  datasetId: string;
  columns: ColumnInfo[];
  setToastMessage: (v: string) => void;
  setToastOpen: (v: boolean) => void;
}

export const DataTabContent: React.FC<DataTabContentProps> = ({
  projectId,
  datasetId,
  columns,
  setToastMessage,
  setToastOpen,
}) => {
  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-sm font-semibold text-text'>Dataset Rows</h3>
        <p className='text-xs text-text-secondary'>
          Manage rows in a spreadsheet-style editor. Click a cell to edit, use Enter to save, Escape to cancel.
        </p>
      </div>

      <RowEditor
        projectId={projectId}
        datasetId={datasetId}
        columns={columns}
        setToastMessage={setToastMessage}
        setToastOpen={setToastOpen}
      />
    </div>
  );
};

export default DataTabContent;