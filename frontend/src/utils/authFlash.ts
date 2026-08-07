const FLASH_KEY = 'testforge_auth_flash';

export type AuthFlashMessage = {
  type: 'success' | 'error';
  message: string;
};

export function setAuthFlash(flash: AuthFlashMessage): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(FLASH_KEY, JSON.stringify(flash));
}

export function consumeAuthFlash(): AuthFlashMessage | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(FLASH_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(FLASH_KEY);
  try {
    return JSON.parse(raw) as AuthFlashMessage;
  } catch {
    return null;
  }
}
