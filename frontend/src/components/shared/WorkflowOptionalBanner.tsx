import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Info } from 'lucide-react';

export interface WorkflowOptionalBannerProps {
  title?: string;
  description: string;
  projectId?: string;
  primaryLink?: { label: string; path: string };
}

/** Explains that a screen is optional / advanced relative to the golden path. */
export const WorkflowOptionalBanner: React.FC<WorkflowOptionalBannerProps> = ({
  title = 'Optional for most workflows',
  description,
  projectId,
  primaryLink,
}) => {
  const navigate = useNavigate();

  return (
    <Card className="mb-6 border-border/80 bg-muted/30">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" />
          <div>
            <p className="text-sm font-medium text-text">{title}</p>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {primaryLink && (
            <Button variant="outline" size="sm" onClick={() => navigate(primaryLink.path)}>
              {primaryLink.label}
            </Button>
          )}
          {projectId && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/overview`)}>
              Get started
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowOptionalBanner;
