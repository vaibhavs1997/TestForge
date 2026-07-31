// Utility functions for validation

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};
