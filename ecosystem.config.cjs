module.exports = {
  apps: [
    {
      name: 'osint-monitor',
      script: 'node_modules/.bin/next',
      args: 'start -p 3003 -H 0.0.0.0',
      cwd: '/Users/clawdbot/Clawd/osint-monitor',
      env: {
        NODE_ENV: 'production',
      },
      exec_mode: 'fork',
      max_memory_restart: '500M',
      autorestart: true,
      log_file: '/tmp/osint-monitor.log',
    },
  ],
};
