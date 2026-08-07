import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

type AuthRedirectProps = {
  mode: 'login' | 'register';
};

/** Legacy /login and /register URLs open the homepage auth modal. */
export const AuthModalRedirect: React.FC<AuthRedirectProps> = ({ mode }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === '1' ? '&expired=1' : '';

  return (
    <Navigate
      to={`/?auth=${mode}${expired}`}
      replace
      state={location.state}
    />
  );
};

export default AuthModalRedirect;
