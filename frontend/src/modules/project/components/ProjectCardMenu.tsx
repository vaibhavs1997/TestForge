// Dropdown menu for project card actions (Rename, Archive/Unarchive, Delete).
import React from 'react';
import { Edit3, Trash2, Archive, RotateCcw } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ProjectCardMenuProps {
  onRename: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
}

export const ProjectCardMenu = ({ onRename, onToggleArchive, onDelete, isArchived = false }: ProjectCardMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside of it
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className='relative' ref={menuRef}>
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className='flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text'
        aria-label='More options'
        aria-haspopup='menu'
        aria-expanded={open}
      >
        <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
          <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
        </svg>
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-background py-1 shadow-lg'
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type='button'
            role='menuitem'
            onClick={() => handleAction(onRename)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface'
            )}
          >
            <Edit3 className='h-4 w-4' />
            Rename
          </button>
          <button
            type='button'
            role='menuitem'
            onClick={() => handleAction(onToggleArchive)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface'
            )}
          >
            {isArchived ? <RotateCcw className='h-4 w-4' /> : <Archive className='h-4 w-4' />}
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            type='button'
            role='menuitem'
            onClick={() => handleAction(onDelete)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface'
            )}
          >
            <Trash2 className='h-4 w-4' />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectCardMenu;
