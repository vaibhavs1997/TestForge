/** Normalize email for storage and lookup (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default normalizeEmail;
