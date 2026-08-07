import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { EntityForm, FormField } from '../../../components/forms/EntityForm';
import { useFormValidation } from '../../../hooks/useFormValidation';
import type { BusinessRuleFormData, RuleSeverity } from '../types';

const SEVERITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BusinessRuleFormData) => void;
  rule?: BusinessRuleFormData;
  projectId: string;
  isSubmitting?: boolean;
}

export const RuleDialog = ({ open, onClose, onSubmit, rule, projectId, isSubmitting }: RuleDialogProps) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [ruleType, setRuleType] = React.useState('');
  const [condition, setCondition] = React.useState('');
  const [expectedOutcome, setExpectedOutcome] = React.useState('');
  const [severity, setSeverity] = React.useState<RuleSeverity>('Medium');
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    if (rule) {
      setName(rule.name);
      setDescription(rule.description);
      setRuleType(rule.ruleType);
      setCondition(rule.condition);
      setExpectedOutcome(rule.expectedOutcome);
      setSeverity(rule.severity);
      setIsActive(rule.isActive);
    } else {
      setName('');
      setDescription('');
      setRuleType('');
      setCondition('');
      setExpectedOutcome('');
      setSeverity('Medium');
      setIsActive(true);
    }
  }, [open, rule]);

  const validate = React.useCallback(() => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    return errors;
  }, [name]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({
      id: rule?.id,
      projectId,
      name: name.trim(),
      description: description.trim(),
      ruleType: ruleType.trim() || 'General',
      condition: condition.trim(),
      expectedOutcome: expectedOutcome.trim(),
      severity,
      linkedApiOperationIds: rule?.linkedApiOperationIds ?? [],
      linkedRequirementIds: rule?.linkedRequirementIds ?? [],
      tags: rule?.tags ?? [],
      isActive,
    });
  };

  const fields: FormField[] = [
    { name: 'name', label: 'Rule Name', type: 'text', required: true, value: name },
    { name: 'description', label: 'Description', type: 'text', value: description },
    { name: 'ruleType', label: 'Rule Type', type: 'text', value: ruleType, placeholder: 'e.g. Validation' },
    { name: 'condition', label: 'Condition', type: 'text', value: condition },
    { name: 'expectedOutcome', label: 'Expected Outcome', type: 'text', value: expectedOutcome },
    { name: 'severity', label: 'Severity', type: 'select', value: severity, options: SEVERITY_OPTIONS },
  ];

  if (!open) return null;

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={rule ? 'Edit Business Rule' : 'Add Business Rule'}
      submitLabel={rule ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-4">
        <EntityForm
          fields={fields}
          values={{ name, description, ruleType, condition, expectedOutcome, severity }}
          onChange={(field, value) => {
            if (field === 'name') {
              setName(value);
              clearError('name');
            } else if (field === 'description') setDescription(value);
            else if (field === 'ruleType') setRuleType(value);
            else if (field === 'condition') setCondition(value);
            else if (field === 'expectedOutcome') setExpectedOutcome(value);
            else if (field === 'severity') setSeverity(value as RuleSeverity);
          }}
          errors={errors}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border"
          />
          Active rule
        </label>
      </div>
    </EntityDialog>
  );
};

export default RuleDialog;
