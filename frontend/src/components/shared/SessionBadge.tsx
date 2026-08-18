import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { authStore } from '../../store/authStore';
import { Button } from '../ui/Button';

export const SessionBadge: React.FC = () => {
  const user = authStore((s) => s.user);
  const loginRequired = authStore((s) => s.loginRequired);
  const logout = authStore((s) => s.logout);
  const navigate = useNavigate();

  if (!loginRequired && !user) {
    return null;
  }

  const label = user?.displayName ?? user?.email ?? 'Signed in';

  const onLogout = () => {
    logout();
    navigate('/', { replace: true, state: { suppressAuthModal: true } });
  };

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary"
        title="Your account — projects are isolated to your organization"
      >
        <User className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{label}</span>
      </span>
      {user ? (
        <Button type="button" variant="ghost" size="sm" onClick={onLogout} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};

export default SessionBadge;
