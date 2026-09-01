import React from 'react';
import { createPortal } from 'react-dom';
import { Edit3, MoreVertical, Trash2 } from 'lucide-react';

interface EndpointActionMenuProps {
  endpointName: string;
  onRename: () => void;
  onDelete: () => void;
}

export const EndpointActionMenu: React.FC<EndpointActionMenuProps> = ({ endpointName, onRename, onDelete }) => {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 148;
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, updatePosition]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        className='mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary transition hover:border-primary/70 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/30'
        aria-label={`Actions for ${endpointName}`}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) updatePosition();
          setOpen((current) => !current);
        }}
      >
        <MoreVertical className='h-4 w-4' aria-hidden='true' />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role='menu'
          aria-label={`${endpointName} actions`}
          className='fixed z-[70] w-[148px] rounded-xl border border-border bg-background p-1 shadow-xl'
          style={{ top: position.top, left: position.left }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type='button'
            role='menuitem'
            className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text transition hover:bg-surface focus:bg-surface focus:outline-none'
            onClick={() => choose(onRename)}
          >
            <Edit3 className='h-3.5 w-3.5 text-primary' aria-hidden='true' />
            Rename
          </button>
          <button
            type='button'
            role='menuitem'
            className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error transition hover:bg-error/10 focus:bg-error/10 focus:outline-none'
            onClick={() => choose(onDelete)}
          >
            <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
            Delete
          </button>
        </div>,
        document.body,
      )}
    </>
  );
};
