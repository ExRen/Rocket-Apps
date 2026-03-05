module.exports = {
  apps: [{
    name       : 'rocket-backend',
    script     : 'apps/backend/dist/main.js',
    instances  : 'max',
    exec_mode  : 'cluster',
    env_production: {
      NODE_ENV  : 'production',
      PORT      : 3001,
    },
    error_file  : '/var/log/rocket/err.log',
    out_file    : '/var/log/rocket/out.log',
    merge_logs  : true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
