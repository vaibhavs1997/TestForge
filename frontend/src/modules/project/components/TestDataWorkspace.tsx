import React from 'react';
import { TestDataLibraryPage } from '../../test-data/pages/DatasetPage';
import { projectStore } from '../../../store/projectStore';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';

interface TestDataWorkspaceProps {
  projectId: string;
}

interface TestDataRenderBoundaryState {
  error: Error | null;
}

class TestDataRenderBoundary extends React.Component<React.PropsWithChildren, TestDataRenderBoundaryState> {
  state: TestDataRenderBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): TestDataRenderBoundaryState {
    return { error };
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className='mx-auto max-w-3xl p-6'>
          <ErrorAlert
            title='Test Data workspace could not be displayed'
            message={this.state.error.message || 'An unexpected rendering error occurred.'}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/** Single Test Data surface — section switching happens inside TestDataLibraryPage. */
export const TestDataWorkspace: React.FC<TestDataWorkspaceProps> = ({ projectId }) => {
  React.useEffect(() => {
    projectStore.getState().setSelectedProjectId(projectId);
  }, [projectId]);

  return (
    <div className='flex-1 overflow-y-auto'>
      <TestDataRenderBoundary>
        <TestDataLibraryPage projectId={projectId} />
      </TestDataRenderBoundary>
    </div>
  );
};

export default TestDataWorkspace;
