import React from 'react';
import { TestDataLibraryPage } from '../../test-data/pages/DatasetPage';

interface TestDataWorkspaceProps {
  projectId: string;
}

/** Single Test Data surface — section switching happens inside TestDataLibraryPage. */
export const TestDataWorkspace: React.FC<TestDataWorkspaceProps> = () => {
  return (
    <div className='flex-1 overflow-y-auto'>
      <TestDataLibraryPage />
    </div>
  );
};

export default TestDataWorkspace;
