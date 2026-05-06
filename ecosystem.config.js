/**
 * PM2 ecosystem file — upload this to the server and run:
 *
 *   pm2 delete destani-next
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *
 * Key improvements vs the previous bare `pm2 start`:
 *   - Explicit Node.js heap cap (512 MB) prevents unbounded GC pauses that
 *     caused the 52-second event-loop latency spikes.
 *   - max_memory_restart: PM2 restarts the process if RSS exceeds 600 MB,
 *     catching slow memory leaks before they kill the server.
 *   - exp_backoff_restart_delay: avoids a crash-loop burning CPU.
 *   - NODE_ENV=production: enables Next.js production optimisations.
 */
module.exports = {
  apps: [
    {
      name: "destani-next",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/destanisystem/htdocs/destanisystem.de",
      exec_mode: "fork",
      instances: 1,

      // ── Memory & crash recovery ─────────────────────────────────────────
      // V8 heap cap.  Without this, Node.js grows the heap until the OS OOM-
      // killer strikes or GC pauses block the event loop for tens of seconds.
      node_args: "--max-old-space-size=512",
      // Restart if RSS (Resident Set Size) exceeds 600 MB.
      max_memory_restart: "600M",
      // Wait an increasing delay before each restart to prevent tight loops.
      exp_backoff_restart_delay: 100,

      // ── Environment ──────────────────────────────────────────────────────
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // ── Logging ──────────────────────────────────────────────────────────
      error_file: "/root/.pm2/logs/destani-next-error.log",
      out_file: "/root/.pm2/logs/destani-next-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // ── Misc ─────────────────────────────────────────────────────────────
      watch: false,
      autorestart: true,
      // Give requests 60 s to drain before a reload/restart kills the process.
      kill_timeout: 60000,
      listen_timeout: 10000,
    },
  ],
};
