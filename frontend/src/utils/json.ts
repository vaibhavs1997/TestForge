// Utility functions for JSON operations

export const parseJson = <T>(json: string): T => {
  return JSON.parse(json) as T;
};

export const stringifyJson = (data: unknown): string => {
  return JSON.stringify(data, null, 2);
};
