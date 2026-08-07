import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { FolderOpen, Import, Globe, ArrowRight } from 'lucide-react';

export interface ApiOnboardingCardProps {
  projectId: string;
  onImport: () => void;
  hasServices: boolean;
  operationCount: number;
  hasEnvironment: boolean;
}

export const ApiOnboardingCard: React.FC<ApiOnboardingCardProps> = ({
  projectId,
  onImport,
  hasServices,
  operationCount,
  hasEnvironment,
}) => {
  const navigate = useNavigate();

  if (hasServices && operationCount > 0) {
    return (
      <Card className="mb-6 border-primary/20 bg-surface">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-text">
                {operationCount} API operation{operationCount === 1 ? '' : 's'} ready for test mapping
              </p>
              <p className="text-sm text-text-secondary">
                {hasEnvironment
                  ? 'Contract and environment are set — add requirements to generate tests.'
                  : 'Set a target environment so runs and Try-it use the correct base URL.'}
              </p>
            </div>
          </div>
          {!hasEnvironment && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/environment`)}>
              <Globe className="mr-2 h-4 w-4" />
              Set environment
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Start with your API contract</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Import OpenAPI, Swagger, or Postman. We extract endpoints and sample request bodies for generated tests.
          </p>
        </div>
        <Button onClick={onImport}>
          <Import className="mr-2 h-4 w-4" />
          Import contract
        </Button>
      </CardContent>
    </Card>
  );
};

export default ApiOnboardingCard;
