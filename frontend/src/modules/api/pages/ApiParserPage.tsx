import React from 'react';
import { useParams } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useImportApiContract } from '../hooks';

export interface ApiParserPageProps {
  projectId?: string;
}

export const ApiParserPage: React.FC<ApiParserPageProps> = ({ projectId: propProjectId }) => {
  const { projectId: routeProjectId, legacyProjectId } = useParams<{
    projectId?: string;
    legacyProjectId?: string;
  }>();
  const projectId = routeProjectId ?? legacyProjectId ?? propProjectId;
  const { importContractAsync, isImporting } = useImportApiContract(projectId);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const resetFileInput = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!projectId) {
      setError('Project is missing.');
      return;
    }

    if (!file) {
      setError('Please choose an API file to import.');
      return;
    }

    try {
      const summary = await importContractAsync({ file });
      setMessage(
        `Imported ${summary.servicesImported} service${summary.servicesImported === 1 ? '' : 's'} and ${summary.operationsImported} operation${summary.operationsImported === 1 ? '' : 's'}.`,
      );
      resetFileInput();
    } catch {
      setError('Import failed. Please try again with a supported API file.');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title='API Parser'
        description='Import a single API contract file.'
      />

      <Card className='mx-auto max-w-2xl'>
        <CardHeader>
          <CardTitle>Import API</CardTitle>
          <CardDescription>Choose one OpenAPI, Swagger, Postman, WSDL, GraphQL, or HAR file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-text' htmlFor='api-file'>
                API file
              </label>
              <input
                ref={fileInputRef}
                id='api-file'
                type='file'
                accept='.json,.yaml,.yml,.xml,.wsdl,.graphql,.gql,.har,.txt'
                onChange={(event) => {
                  setError(null);
                  setMessage(null);
                  setFile(event.target.files?.[0] ?? null);
                }}
                className='block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text file:mr-4 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:bg-surface/80'
              />
              <p className='text-xs text-text-secondary'>
                Select one file, then import it.
              </p>
              {file && (
                <p className='text-xs text-text-secondary'>
                  Selected: <span className='font-medium text-text'>{file.name}</span>
                </p>
              )}
            </div>

            {error && <p className='text-sm text-error'>{error}</p>}
            {message && <p className='text-sm text-green-600'>{message}</p>}

            <div className='flex justify-end'>
              <Button type='submit' loading={isImporting} disabled={!projectId}>
                <Upload className='mr-2 h-4 w-4' />
                Import API
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default ApiParserPage;
