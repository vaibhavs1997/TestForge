// Add Article modal for creating and editing knowledge base documentation.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import { Badge } from '../../../components/ui/Badge';
import type { DocumentationFormData } from '../types';

export interface AddArticleModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: DocumentationFormData) => void;
  initialData?: Partial<DocumentationFormData>;
  isSubmitting?: boolean;
  existingCategories?: string[];
}

const categoryOptions = [
  { value: 'Tutorials', label: 'Tutorials' },
  { value: 'Guides', label: 'Guides' },
  { value: 'Documentation', label: 'Documentation' },
  { value: 'Notes', label: 'Notes' },
];

export const AddArticleModal = ({ open, onClose, onCreate, initialData, isSubmitting, existingCategories = [] }: AddArticleModalProps) => {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('Tutorials');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [content, setContent] = React.useState('');
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '');
      setCategory(initialData?.category || 'Tutorials');
      setTags(initialData?.tags || []);
      setTagInput('');
      setContent(initialData?.content || '');
      setError(undefined);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Documentation title is required');
      return;
    }
    onCreate({
      id: initialData?.id,
      projectId: initialData?.projectId || '',
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      linkedApiOperationIds: initialData?.linkedApiOperationIds || [],
      linkedRequirementIds: initialData?.linkedRequirementIds || [],
      author: initialData?.author || '',
      version: initialData?.version || '1.0.0',
    });
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <Card className='mx-4 flex max-h-[90vh] w-full max-w-lg flex-col' onClick={(e) => e.stopPropagation()}>
        <CardHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle>{initialData?.id ? 'Edit Documentation' : 'Add Documentation'}</CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={onClose}
              aria-label='Close'
              type='button'
              disabled={isSubmitting}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <CardContent className='min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <TextInput
              label='Title'
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder='Documentation title'
              error={error}
              required
            />
            <Select
              label='Category'
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
            <div>
              <label className='mb-1.5 block text-sm font-medium text-text'>Tags</label>
              <div className='flex flex-wrap gap-2 rounded-lg border border-border bg-background p-2 min-h-10'>
                {tags.map((tag) => (
                  <Badge key={tag} variant='secondary' className='flex items-center gap-1'>
                    {tag}
                    <button
                      type='button'
                      onClick={() => handleRemoveTag(tag)}
                      className='ml-1 text-text-secondary hover:text-text'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
                <input
                  type='text'
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? 'Type and press Enter to add tags...' : ''}
                  className='flex-1 min-w-32 bg-transparent text-sm text-text placeholder:text-text-secondary/50 focus:outline-none'
                />
              </div>
              {tags.length > 0 && (
                <p className='mt-1 text-xs text-text-secondary'>Press Enter to add a tag</p>
              )}
            </div>
            <TextArea
              label='Content'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder='Write your documentation content...'
              rows={5}
            />
          </CardContent>
          <CardFooter className='flex-shrink-0 justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Documentation' : 'Add Documentation'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AddArticleModal;