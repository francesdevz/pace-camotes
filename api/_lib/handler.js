import { fail } from './util.js';

// Wraps a route so configuration problems and unexpected errors return clear JSON.
export function route(fn) {
  return async function handler(req, res) {
    try {
      await fn(req, res);
    } catch (err) {
      if (err && err.code === 'not_configured') {
        console.error('[config]', err.message);
        return fail(res, 500, 'The booking system is not set up yet: ' + err.message + '.');
      }
      console.error(err);
      return fail(res, 500, 'Something went wrong on our side. Please try again.');
    }
  };
}
