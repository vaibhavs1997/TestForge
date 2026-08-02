// ColumnProfileDialog - Unified editor for columns with General/Population/Validation sections
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';

export interface ColumnProfileData {
  id?: string;
  datasetId: string;
  name: string;
  displayName: string;
  dataType: string;
  description: string;
  strategyType: string;
  strategyConfig: Record<string, any>;
  required: boolean;
  nullable: boolean;
  unique: boolean;
}

export interface ColumnProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ColumnProfileData) => void;
  column?: ColumnProfileData;
  isSubmitting?: boolean;
}

const dataTypeOptions = [
  { value: 'Text', label: 'Text' },
  { value: 'Number', label: 'Number' },
  { value: 'Decimal', label: 'Decimal' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'Date', label: 'Date' },
  { value: 'DateTime', label: 'DateTime' },
  { value: 'Email', label: 'Email' },
  { value: 'Phone', label: 'Phone' },
  { value: 'UUID', label: 'UUID' },
  { value: 'JSON', label: 'JSON' },
];

const strategyOptions = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Static Value', label: 'Static Value' },
  { value: 'Existing Dataset', label: 'Existing Dataset' },
  { value: 'Generator', label: 'Generator' },
  { value: 'Provider', label: 'Provider' },
  { value: 'Runtime Response', label: 'Runtime Response' },
  { value: 'Environment Variable', label: 'Environment Variable' },
];

const generatorOptions = [
  { value: 'UUID', label: 'UUID' },
  { value: 'Current Date', label: 'Current Date' },
  { value: 'Current DateTime', label: 'Current DateTime' },
  { value: 'Random Number', label: 'Random Number' },
  { value: 'Random String', label: 'Random String' },
  { value: 'Random Email', label: 'Random Email' },
  { value: 'Random Phone', label: 'Random Phone' },
  { value: 'Random Boolean', label: 'Random Boolean' },
];

const mockDatasets = [
  { value: '1', label: 'Users' },
  { value: '2', label: 'Customers' },
  { value: '3', label: 'Products' },
  { value: '4', label: 'Orders' },
  { value: '5', label: 'Payments' },
];

const mockColumns = [
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'password', label: 'Password' },
  { value: 'phoneNumber', label: 'Phone Number' },
];

type TabSection = 'General' | 'Population' | 'Validation';

export const ColumnProfileDialog = ({ open, onClose, onSubmit, column, isSubmitting }: ColumnProfileDialogProps) => {
  const [activeSection, setActiveSection] = React.useState<TabSection>('General');
  const [name, setName] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [dataType, setDataType] = React.useState('Text');
  const [description, setDescription] = React.useState('');
  const [strategyType, setStrategyType] = React.useState('Manual');
  const [staticValue, setStaticValue] = React.useState('');
  const [selectedDataset, setSelectedDataset] = React.useState('');
  const [selectedColumn, setSelectedColumn] = React.useState('');
  const [selectedGenerator, setSelectedGenerator] = React.useState('UUID');
  const [required, setRequired] = React.useState(false);
  const [nullable, setNullable] = React.useState(true);
  const [unique, setUnique] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (column) {
        setName(column.name);
        setDisplayName(column.displayName);
        setDataType(column.dataType);
        setDescription(column.description);
        setStrategyType(column.strategyType);
        setStaticValue(column.strategyConfig?.value || '');
        setSelectedDataset(column.strategyConfig?.datasetId || '');
        setSelectedColumn(column.strategyConfig?.column || '');
        setSelectedGenerator(column.strategyConfig?.generator || 'UUID');
        setRequired(column.required);
        setNullable(column.nullable);
        setUnique(column.unique);
      } else {
        setName('');
        setDisplayName('');
        setDataType('Text');
        setDescription('');
        setStrategyType('Manual');
        setStaticValue('');
        setSelectedDataset('');
        setSelectedColumn('');
        setSelectedGenerator('UUID');
        setRequired(false);
        setNullable(true);
        setUnique(false);
      }
      setErrors({});
      setActiveSection('General');
    }
  }, [open, column]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Column name is required';
    if (!dataType.trim()) newErrors.dataType = 'Data type is required';
    if (strategyType === 'Static Value' && !staticValue.trim()) newErrors.staticValue = 'Value is required';
    if (strategyType === 'Existing Dataset') {
      if (!selectedDataset) newErrors.dataset = 'Dataset is required';
      if (!selectedColumn) newErrors.column = 'Column is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let strategyConfig: Record<string, any> = {};
    switch (strategyType) {
      case 'Static Value': strategyConfig = { value: staticValue }; break;
      case 'Existing Dataset': strategyConfig = { datasetId: selectedDataset, column: selectedColumn }; break;
      case 'Generator': strategyConfig = { generator: selectedGenerator }; break;
      default: strategyConfig = {}; break;
    }

    onSubmit({
      id: column?.id,
      datasetId: column?.datasetId || '',
      name: name.trim(),
      displayName: displayName.trim() || name.trim(),
      dataType,
      description: description.trim(),
      strategyType,
      strategyConfig,
      required,
      nullable,
      unique,
    });
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={onClose}>
      <Card className='mx-4 w-full max-w-3xl' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>{column ? 'Edit Column' : 'Add Column'}</CardTitle>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={onClose} aria-label='Close' type='button' disabled={isSubmitting}>
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='flex gap-1 border-b border-border'>
            {(['General', 'Population', 'Validation'] as TabSection[]).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeSection === section ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4 pt-4'>
            {activeSection === 'General' && (
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <TextInput label='Column Name' value={name} onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }} placeholder='e.g., email, firstName' error={errors.name} required />
                  <TextInput label='Display Name' value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder='e.g., Email Address' />
                </div>
                <Select label='Data Type' value={dataType} onChange={(e) => setDataType(e.target.value)} options={dataTypeOptions} />
                <TextInput label='Description' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Optional description' />
              </div>
            )}

            {activeSection === 'Population' && (
              <div className='space-y-4'>
                <Select label='Strategy Type' value={strategyType} onChange={(e) => setStrategyType(e.target.value)} options={strategyOptions} />
                {strategyType === 'Static Value' && (
                  <TextInput label='Value' value={staticValue} onChange={(e) => { setStaticValue(e.target.value); setErrors(prev => ({ ...prev, staticValue: '' })); }} placeholder='e.g., Active, true, 100' error={errors.staticValue} />
                )}
                {strategyType === 'Existing Dataset' && (
                  <div className='space-y-4'>
                    <Select label='Dataset' value={selectedDataset} onChange={(e) => { setSelectedDataset(e.target.value); setErrors(prev => ({ ...prev, dataset: '' })); }} options={mockDatasets} />
                    {errors.dataset && <p className='text-sm text-error'>{errors.dataset}</p>}
                    <Select label='Column' value={selectedColumn} onChange={(e) => { setSelectedColumn(e.target.value); setErrors(prev => ({ ...prev, column: '' })); }} options={mockColumns} />
                    {errors.column && <p className='text-sm text-error'>{errors.column}</p>}
                  </div>
                )}
                {strategyType === 'Generator' && (
                  <Select label='Generator' value={selectedGenerator} onChange={(e) => setSelectedGenerator(e.target.value)} options={generatorOptions} />
                )}
                {strategyType === 'Manual' && (
                  <p className='text-sm text-text-secondary'>No configuration needed. Values will be entered manually.</p>
                )}
                {(strategyType === 'Provider' || strategyType === 'Runtime Response' || strategyType === 'Environment Variable') && (
                  <p className='text-xs text-text-secondary'>{strategyType} configuration will be available in a future update.</p>
                )}
              </div>
            )}

            {activeSection === 'Validation' && (
              <div className='space-y-4'>
                <div className='flex items-center gap-2'>
                  <input type='checkbox' checked={required} onChange={(e) => setRequired(e.target.checked)} className='h-4 w-4 rounded border-border' id='required' />
                  <label htmlFor='required' className='text-sm text-text'>Required</label>
                </div>
                <div className='flex items-center gap-2'>
                  <input type='checkbox' checked={unique} onChange={(e) => setUnique(e.target.checked)} className='h-4 w-4 rounded border-border' id='unique' />
                  <label htmlFor='unique' className='text-sm text-text'>Unique</label>
                </div>
                <div className='flex items-center gap-2'>
                  <input type='checkbox' checked={nullable} onChange={(e) => setNullable(e.target.checked)} className='h-4 w-4 rounded border-border' id='nullable' />
                  <label htmlFor='nullable' className='text-sm text-text'>Nullable</label>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Saving...' : column ? 'Update' : 'Save'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ColumnProfileDialog;
