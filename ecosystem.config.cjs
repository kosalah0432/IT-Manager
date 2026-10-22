module.exports = {
  apps: [
    {
      name: 'it-tech-manager',
      script: 'server.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: 'err.log',
      out_file: 'out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
