import { describe, expect, it } from 'vitest';
import { CSP, WEB_PREFERENCES, isAllowedExternalUrl } from '../../src/main/security';

describe('window security', () => {
  it('isolates the renderer', () => {
    expect(WEB_PREFERENCES).toMatchObject({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    });
  });

  it('allows no remote content', () => {
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).toContain("connect-src 'none'");
    expect(CSP).not.toMatch(/https?:/);
    expect(CSP).not.toContain("'unsafe-eval'");
  });

  it('opens only allowlisted HTTPS documentation', () => {
    expect(
      isAllowedExternalUrl('https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab'),
    ).toBe(true);
    expect(
      isAllowedExternalUrl('http://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab'),
    ).toBe(false);
    expect(isAllowedExternalUrl('https://github.com.evil.test/x')).toBe(false);
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedExternalUrl('not a url')).toBe(false);
  });
});
