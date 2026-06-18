export const baseUrl = import.meta.env.BASE_URL || '/';
export const urlParams = new URLSearchParams(window.location.search);

export const uaData = (
  navigator as unknown as {
    userAgentData?: { platform: string };
  }
).userAgentData;

export const isWindows = uaData?.platform === 'Windows' || navigator.userAgent.includes('Windows');
