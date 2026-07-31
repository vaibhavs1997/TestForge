// Utility functions for date operations

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const formatDuration = (ms: number): string => {
  return `${ms}ms`;
};
