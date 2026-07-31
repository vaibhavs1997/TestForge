import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/Alert';
import { Separator } from '../components/ui/Separator';
import { Spinner } from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { TextInput } from '../components/forms/TextInput';
import { TextArea } from '../components/forms/TextArea';
import { Select } from '../components/forms/Select';
import { Checkbox } from '../components/forms/Checkbox';
import { Switch } from '../components/forms/Switch';
import { FormField } from '../components/forms/FormField';
import { PageHeader } from '../components/layout/PageHeader';
import { Section } from '../components/layout/Section';
import { PageContainer } from '../components/layout/PageContainer';
import { SearchBar } from '../components/shared/SearchBar';
import { DataTable } from '../components/tables/DataTable';

export const ShowcasePage = () => {
  const [searchValue, setSearchValue] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status', render: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> },
    { key: 'role', header: 'Role' },
  ];

  const data = [
    { name: 'John Doe', status: 'Active', role: 'Admin' },
    { name: 'Jane Smith', status: 'Inactive', role: 'User' },
  ];

  return (
    <PageContainer>
      <PageHeader title='Design System Showcase' description='All design system components rendered for verification.' />

      <Section title='UI Components'>
        <div className='grid gap-4'>
          <Card>
            <CardHeader><CardTitle>Buttons</CardTitle><CardDescription>All button variants and sizes</CardDescription></CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              <Button variant='default'>Default</Button>
              <Button variant='secondary'>Secondary</Button>
              <Button variant='outline'>Outline</Button>
              <Button variant='ghost'>Ghost</Button>
              <Button variant='link'>Link</Button>
              <Button variant='destructive'>Destructive</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button size='sm'>Small</Button>
              <Button size='lg'>Large</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Badges</CardTitle></CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              <Badge>Default</Badge>
              <Badge variant='secondary'>Secondary</Badge>
              <Badge variant='destructive'>Destructive</Badge>
              <Badge variant='outline'>Outline</Badge>
              <Badge variant='success'>Success</Badge>
              <Badge variant='warning'>Warning</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
            <CardContent className='space-y-2'>
              <Alert><AlertTitle>Default</AlertTitle><AlertDescription>This is a default alert.</AlertDescription></Alert>
              <Alert variant='info'><AlertTitle>Info</AlertTitle><AlertDescription>This is an info alert.</AlertDescription></Alert>
              <Alert variant='success'><AlertTitle>Success</AlertTitle><AlertDescription>This is a success alert.</AlertDescription></Alert>
              <Alert variant='warning'><AlertTitle>Warning</AlertTitle><AlertDescription>This is a warning alert.</AlertDescription></Alert>
              <Alert variant='error'><AlertTitle>Error</AlertTitle><AlertDescription>This is an error alert.</AlertDescription></Alert>
            </CardContent>
          </Card>

          <div className='flex flex-wrap gap-4'>
            <Spinner />
            <Spinner size='sm' />
            <Spinner size='lg' />
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-8 w-32' />
          </div>

          <Separator />

          <EmptyState title='No items found' description='Try adjusting your search criteria.' />
        </div>
      </Section>

      <Section title='Form Components'>
        <div className='grid gap-4 max-w-md'>
          <FormField label='Text Input' helperText='Enter your name'>
            <TextInput placeholder='Enter text' value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          </FormField>
          <FormField label='Email' error='Invalid email'>
            <TextInput placeholder='Email' error='Invalid email' />
          </FormField>
          <FormField label='Description'>
            <TextArea placeholder='Enter description' />
          </FormField>
          <FormField label='Role'>
            <Select options={[{ value: '1', label: 'Admin' }, { value: '2', label: 'User' }]} placeholder='Select role' />
          </FormField>
          <Checkbox label='Accept terms' />
          <Switch label='Enable notifications' />
          <SearchBar value={searchValue} onChange={setSearchValue} placeholder='Search...' />
        </div>
      </Section>

      <Section title='Table Components'>
        <DataTable columns={columns} data={data} />
      </Section>
    </PageContainer>
  );
};

export default ShowcasePage;
