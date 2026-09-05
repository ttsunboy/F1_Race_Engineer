/**
 * Backend endpoint resolution — follows the host the page was opened from.
 *
 * If the page is served from http://127.0.0.1:3000, API/WS target 127.0.0.1:8000.
 * If opened via a LAN IP (e.g. http://192.168.x.x:3000), targets the same host
 * on port 8000 — so phones/other devices on the LAN just work, and we never
 * depend on `localhost` resolving to the right loopback (IPv4 vs ::1).
 */

function backendHost(): string {
  if (typeof window === 'undefined') return '127.0.0.1';
  return window.location.hostname || '127.0.0.1';
}

export function apiBaseUrl(): string {
  return `http://${backendHost()}:8000`;
}

export function wsBaseUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${backendHost()}:8000`;
}
