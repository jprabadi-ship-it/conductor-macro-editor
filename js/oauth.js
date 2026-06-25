const CLIENT_ID = 'Ov23liOevuI7iqvrfWAd';
const PROXY_URL = 'https://conductor-macro-auth.productive-doom.workers.dev';
const SCOPE = 'repo';
const POLL_INTERVAL = 5000;

export async function startDeviceFlow() {
  const resp = await fetch(`${PROXY_URL}/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPE }),
  });

  if (!resp.ok) throw new Error('Failed to start device flow');
  return resp.json();
}

export async function pollForToken(deviceCode) {
  while (true) {
    await sleep(POLL_INTERVAL);

    const resp = await fetch(`${PROXY_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await resp.json();

    if (data.access_token) return data.access_token;
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      await sleep(5000);
      continue;
    }
    if (data.error === 'expired_token') throw new Error('Code expired — try again');
    if (data.error === 'access_denied') throw new Error('Access denied');
    if (data.error) throw new Error(data.error_description || data.error);
  }
}

export function isConfigured() {
  return CLIENT_ID !== '__CLIENT_ID__' && PROXY_URL !== '__PROXY_URL__';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
