import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Play, Settings, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';
import type { ExecutionPlan } from '../../requirements/types';
import type { ExecutionProfile } from '../types/profile';
import type { Requirement } from '../../requirements/types';

export interface ExecutionRunHeroProps {
  projectId: string;
  requirements: Requirement[];
  executionPlans: ExecutionPlan[];
  profiles: ExecutionProfile[];
  selectedRequirementId: string;
  onRequirementChange: (id: string) => void;
  selectedExecutionPlanId: string;
  onPlanChange: (id: string) => void;
  selectedProfileId: string;
  onProfileChange: (id: string) => void;
  onStart: () => void;
  isStarting: boolean;
  onBuildExecutionPlans?: () => void | Promise<void>;
  isBuildingPlans?: boolean;
}

export const ExecutionRunHero: React.FC<ExecutionRunHeroProps> = ({
  projectId,
  requirements,
  executionPlans,
  profiles,
  selectedRequirementId,
  onRequirementChange,
  selectedExecutionPlanId,
  onPlanChange,
  selectedProfileId,
  onProfileChange,
  onStart,
  isStarting,
  onBuildExecutionPlans,
  isBuildingPlans,
}) => {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const plansForRequirement = React.useMemo(() => {
    if (!selectedRequirementId) return executionPlans.filter((p) => p.status !== 'Disabled');
    return executionPlans.filter(
      (p) => p.requirementId === selectedRequirementId && p.status !== 'Disabled',
    );
  }, [executionPlans, selectedRequirementId]);

  const readyCount = plansForRequirement.length;
  const selectedReq = requirements.find((r) => r.id === selectedRequirementId);

  React.useEffect(() => {
    if (plansForRequirement.length === 0) return;
    const stillValid = plansForRequirement.some((p) => p.id === selectedExecutionPlanId);
    if (!stillValid) {
      const sorted = [...plansForRequirement].sort((a, b) => a.executionOrder - b.executionOrder);
      onPlanChange(sorted[0].id);
    }
  }, [plansForRequirement, selectedExecutionPlanId, onPlanChange]);

  return (
    <Card className="mb-6 border-primary/30">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Run tests for a requirement</h2>
          <p className="text-sm text-text-secondary">
            Pick a requirement with ready execution steps, then start the run. Generate plans from Requirements if none appear.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary" htmlFor="exec-req">
              Requirement
            </label>
            <select
              id="exec-req"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
              value={selectedRequirementId}
              onChange={(e) => onRequirementChange(e.target.value)}
            >
              <option value="">All requirements</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title.length > 60 ? `${r.title.slice(0, 57)}…` : r.title}
                </option>
              ))}
            </select>
            {selectedReq?.jiraIssueKey && (
              <p className="mt-1 text-xs text-text-secondary">Jira: {selectedReq.jiraIssueKey}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary" htmlFor="exec-plan">
              Execution step
            </label>
            <select
              id="exec-plan"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
              value={selectedExecutionPlanId}
              onChange={(e) => onPlanChange(e.target.value)}
              disabled={readyCount === 0}
            >
              {readyCount === 0 ? (
                <option value="">No ready steps — generate from Requirements</option>
              ) : (
                plansForRequirement
                  .sort((a, b) => a.executionOrder - b.executionOrder)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      Step {plan.executionOrder}: {plan.requestTemplate?.method}{' '}
                      {plan.requestTemplate?.path || ''}
                    </option>
                  ))
              )}
            </select>
            <p className="mt-1 text-xs text-text-secondary">
              {readyCount} ready step{readyCount === 1 ? '' : 's'}
              {selectedRequirementId ? ' for this requirement' : ''}
            </p>
            {readyCount === 0 && selectedRequirementId && onBuildExecutionPlans ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto px-0 text-xs"
                disabled={isBuildingPlans}
                onClick={() => void onBuildExecutionPlans()}
              >
                {isBuildingPlans ? 'Building steps…' : 'Build execution steps from test cases'}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void onStart()}
            disabled={!selectedExecutionPlanId || isStarting}
          >
            <Play className="mr-2 h-4 w-4" />
            {isStarting ? 'Starting…' : 'Run tests'}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/requirements`)}>
            <ListChecks className="mr-2 h-4 w-4" />
            Requirements
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <Settings className="mr-1 h-4 w-4" />
            Advanced
            {advancedOpen ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
          </Button>
        </div>

        {advancedOpen && (
          <div className="rounded-lg border border-border bg-surface/50 p-4">
            <label className="mb-1 block text-xs font-medium text-text-secondary" htmlFor="exec-profile">
              Execution profile
            </label>
            <select
              id="exec-profile"
              className="max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
              value={selectedProfileId}
              onChange={(e) => onProfileChange(e.target.value)}
            >
              {profiles.filter((p) => p.enabled).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-auto px-0 text-sm text-primary"
              onClick={() => navigate(`/projects/${projectId}/execution/profiles`)}
            >
              Manage profiles
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutionRunHero;
