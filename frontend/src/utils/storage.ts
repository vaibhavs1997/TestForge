// Utility functions for local storage

export const getItem = (key: string): string | null => {
  return localStorage.getItem(key);
};

export const setItem = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

export const removeItem = (key: string): void => {
  localStorage.removeItem(key);
};
