// In-memory access token.
//
// Deliberately NOT localStorage: the refresh token already lives in an
// httpOnly cookie the JS can't read, and keeping the short-lived access
// token in memory means an XSS can't walk away with a week-long session.
// The token is re-obtained on load via POST /api/users/refresh.
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
};
