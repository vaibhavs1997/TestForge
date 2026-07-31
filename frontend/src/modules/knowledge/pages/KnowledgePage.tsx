// External libraries
import React from 'react';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BookOpen, Plus, FileText, Tag, Search as SearchIcon } from 'lucide-react';

// Styles

export interface KnowledgePageProps {}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  author: string;
  lastUpdated: string;
  views: number;
}

export const KnowledgePage: React.FC<KnowledgePageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const articles: KnowledgeArticle[] = [
    {
      id: '1',
      title: 'Getting Started with API Testing',
      category: 'Tutorials',
      tags: ['beginner', 'api', 'testing'],
      author: 'John Smith',
      lastUpdated: '2024-01-15T10:30:00Z',
      views: 1234,
    },
    {
      id: '2',
      title: 'Best Practices for Test Automation',
      category: 'Guides',
      tags: ['automation', 'best-practices'],
      author: 'Jane Doe',
      lastUpdated: '2024-01-14T16:20:00Z',
      views: 987,
    },
    {
      id: '3',
      title: 'Understanding Test Suites',
      category: 'Tutorials',
      tags: ['suites', 'organization'],
      author: 'Mike Johnson',
      lastUpdated: '2024-01-14T14:10:00Z',
      views: 756,
    },
    {
      id: '4',
      title: 'Performance Testing Guidelines',
      category: 'Guides',
      tags: ['performance', 'load-testing'],
      author: 'Sarah Williams',
      lastUpdated: '2024-01-13T10:00:00Z',
      views: 543,
    },
  ];

  const categories = ['all', ...new Set(articles.map((article) => article.category))];

  const filteredArticles = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesSearch =
        !term ||
        article.title.toLowerCase().includes(term) ||
        article.tags.some((tag) => tag.toLowerCase().includes(term)) ||
        article.author.toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      Tutorials: 'default',
      Guides: 'secondary',
      Documentation: 'outline',
    };
    return <Badge variant={variants[category] || 'default'}>{category}</Badge>;
  };

  if (filteredArticles.length === 0) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Knowledge Base</h1>
            <p className='mt-1 text-sm text-text-secondary'>Documentation and guides for your team</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create Article
            </Button>
          </div>
        </div>
        <EmptyState
          icon={<BookOpen className='h-12 w-12' />}
          title='No articles found'
          description={search ? 'Try adjusting your search criteria.' : 'Create your first article to share knowledge.'}
          action={search ? undefined : { label: 'Create Article', onClick: () => console.log('Create clicked') }}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Knowledge Base</h1>
          <p className='mt-1 text-sm text-text-secondary'>Documentation and guides for your team</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Create Article
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Total Articles</CardTitle>
            <FileText className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>{articles.length}</div>
            <p className='text-xs text-text-secondary'>Published content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Categories</CardTitle>
            <Tag className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>{categories.length - 1}</div>
            <p className='text-xs text-text-secondary'>Organized topics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Total Views</CardTitle>
            <SearchIcon className='h-4 w-4 text-purple-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>3,520</div>
            <p className='text-xs text-text-secondary'>All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search articles...' className='sm:w-80' />
      </div>

      {/* Articles */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {filteredArticles.map((article) => (
          <Card key={article.id} className='transition-shadow hover:shadow-md'>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <CardTitle className='line-clamp-2'>{article.title}</CardTitle>
              </div>
              <CardDescription className='flex items-center gap-2'>
                {getCategoryBadge(article.category)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <div className='flex flex-wrap gap-1'>
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant='secondary' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Author</span>
                  <span className='font-medium text-text'>{article.author}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Views</span>
                  <span className='font-medium text-text'>{article.views.toLocaleString()}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Updated</span>
                  <span className='font-medium text-text'>{new Date(article.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
              <div className='mt-4'>
                <Button variant='outline' size='sm' className='w-full'>
                  Read Article
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KnowledgePage;