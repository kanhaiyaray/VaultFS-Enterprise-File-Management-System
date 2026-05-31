import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedVisitorId = null;

export const getDeviceFingerprint = async () => {
  if (cachedVisitorId) return cachedVisitorId;
  
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedVisitorId = result.visitorId;
    return cachedVisitorId;
  } catch (err) {
    console.error('Fingerprint generation failed:', err);
    // Fallback to browser-based fingerprint
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      navigator.language,
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || ''
    ];
    cachedVisitorId = components.join('|');
    return cachedVisitorId;
  }
};

export const getDeviceInfo = () => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screenResolution: `${screen.width}x${screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemory: navigator.deviceMemory,
  touchSupport: 'ontouchstart' in window,
  cookieEnabled: navigator.cookieEnabled,
});