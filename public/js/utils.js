/**
 * Simple helpers for fetching and storage.
 *
 * These helpers attach to the global `AppUtils` object so they can be used
 * from plain <script> tags without needing module loading.
 */

window.AppUtils = window.AppUtils || {};

window.AppUtils.safeFetch = function (url, options = {}) {
  const token = window.localStorage.getItem('token');
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }).then((res) => {
    if (!res.ok) {
      return res.json().then((body) => {
        const err = new Error(body?.message || 'Request failed');
        err.status = res.status;
        throw err;
      });
    }

    return res.json();
  });
};

window.AppUtils.getLocalUser = function () {
  try {
    return JSON.parse(window.localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

window.AppUtils.setLocalUser = function (user) {
  window.localStorage.setItem('user', JSON.stringify(user));
};
