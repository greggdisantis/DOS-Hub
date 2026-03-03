import { describe, it, expect } from 'vitest';

/**
 * OAuth Configuration Validation Tests
 * Validates that OAuth environment variables are properly set and accessible
 */
describe('OAuth Configuration', () => {
  it('should have EXPO_PUBLIC_OAUTH_PORTAL_URL set', () => {
    const portalUrl = process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL;
    expect(portalUrl).toBeDefined();
    expect(portalUrl).toBeTruthy();
    expect(portalUrl).toMatch(/^https?:\/\//);
  });

  it('should have EXPO_PUBLIC_OAUTH_SERVER_URL set', () => {
    const serverUrl = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;
    expect(serverUrl).toBeDefined();
    expect(serverUrl).toBeTruthy();
    expect(serverUrl).toMatch(/^https?:\/\//);
  });

  it('should have EXPO_PUBLIC_OWNER_OPEN_ID set', () => {
    const ownerId = process.env.EXPO_PUBLIC_OWNER_OPEN_ID;
    expect(ownerId).toBeDefined();
    expect(ownerId).toBeTruthy();
  });

  it('should have EXPO_PUBLIC_OWNER_NAME set', () => {
    const ownerName = process.env.EXPO_PUBLIC_OWNER_NAME;
    expect(ownerName).toBeDefined();
    expect(ownerName).toBeTruthy();
  });

  it('should construct valid OAuth login URL', () => {
    const portalUrl = process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL;
    const ownerId = process.env.EXPO_PUBLIC_OWNER_OPEN_ID;
    
    expect(portalUrl).toBeDefined();
    expect(ownerId).toBeDefined();
    
    const loginUrl = `${portalUrl}/app-auth?owner=${ownerId}`;
    expect(loginUrl).toMatch(/^https?:\/\/.*\/app-auth\?owner=/);
  });

  it('should have all OAuth URLs use HTTPS', () => {
    const portalUrl = process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL;
    const serverUrl = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;
    
    expect(portalUrl).toMatch(/^https:\/\//);
    expect(serverUrl).toMatch(/^https:\/\//);
  });
});
