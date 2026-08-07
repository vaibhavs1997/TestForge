export interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  acceptTerms?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address';
  return undefined;
}

export function validatePassword(password: string, forRegister = false): string | undefined {
  if (!password) return 'Password is required';
  const minLen = forRegister ? 6 : 8;
  if (password.length < minLen) return `Password must be at least ${minLen} characters`;
  if (forRegister) {
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Use at least one letter and one number';
    }
  }
  return undefined;
}

export function validateRegisterForm(input: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  acceptTerms: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  const emailErr = validateEmail(input.email);
  if (emailErr) errors.email = emailErr;

  const passwordErr = validatePassword(input.password, true);
  if (passwordErr) errors.password = passwordErr;

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!input.organizationName.trim()) {
    errors.organizationName = 'Organization name is required';
  }

  if (!input.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!input.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!input.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms to continue';
  }

  return errors;
}

export function validateLoginForm(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return fallback;
}
