import { describe, expect, it } from 'vitest';
import { sensitiveDataRedactor } from './SensitiveDataRedactionService.js';

describe('SensitiveDataRedactionService', () => {
  it('redacts nested credentials and headers without mutating the source payload', () => {
    const source = {
      headers: { Authorization: 'Bearer secret-token', 'x-request-id': 'safe' },
      nested: { apiKey: 'key-123', array: [{ password: 'p@ss' }] },
      body: '<script>legitimate security test</script>',
    };
    const redacted = sensitiveDataRedactor.redact(source);

    expect(redacted).toMatchObject({
      headers: { Authorization: '[REDACTED]', 'x-request-id': 'safe' },
      nested: { apiKey: '[REDACTED]', array: [{ password: '[REDACTED]' }] },
      body: '<script>legitimate security test</script>',
    });
    expect(source.headers.Authorization).toBe('Bearer secret-token');
    expect(source.nested.apiKey).toBe('key-123');
  });
});
