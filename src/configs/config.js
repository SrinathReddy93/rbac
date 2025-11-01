// src/config.js
const config = {
  jwt: {
    accessExpiry: '15m',
    refreshExpiry: '7d',
    accessSecret: process.env.ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshSecret: process.env.REFRESH_SECRET || 'dev_refresh_secret_change_me',
  },
};

export { config };
