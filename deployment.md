# Senarai — Deployment Guide

**Product:** Senarai — access-aware project history.
**What is deployed:** one Next.js 15 application. No database, no external service. Business logic lives in `lib/`, the mock dataset in `data/`, and state is in memory.
**Not deployed:** the MCP server. It runs over stdio on the machine of whoever uses it — the client launches `node mcp/dist/server.mjs` as a subprocess, so it needs no port, no URL and no PM2 entry. Deploying the web app and using the MCP server are independent: neither needs the other. See §10.
**Deployment model:** direct VPS. Node.js runs the Next.js standalone server under PM2 on port 3000; Nginx terminates TLS and proxies to it. No Docker.

---

## 1. Prerequisites

### 1.1 VPS

| Spec | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 10 GB SSD | 20 GB SSD |
| Network | Public IP, ports 80/443 open | Domain pointed at the VPS |

### 1.2 Software

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2, Nginx, Certbot
sudo npm install -g pm2
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Git
sudo apt-get install -y git
```

Verify: `node -v` (≥ 20), `npm -v`, `pm2 -v`, `nginx -v`.

---

## 2. Build

The app uses `output: 'standalone'` (`next.config.mjs`), so the build emits a self-contained server that does not need the full `node_modules` on the target machine.

```bash
npm ci
npm run typecheck     # tsc --noEmit
npm test              # vitest run — 39 tests
npm run build         # writes .next/standalone
```

Confirm the server exists:

```bash
test -f .next/standalone/server.js && echo "standalone ready"
```

### 2.1 If the build fails with `EPERM ... .next/trace`

Some sandboxed or file-synced environments (OneDrive, aggressive AV) deny Next's diagnostic trace writer. The trace file does not affect output. Use:

```bash
npm run build:local
```

That runs the same build with `scripts/build-trace-shim.cjs` preloaded, which stubs the trace stream only. A normal VPS does not need it.

---

## 3. Deploy

### 3.1 Directory layout on the VPS

```
/var/www/senarai/
├── server.js               # from .next/standalone
├── .next/
│   ├── static/             # copied from .next/static
│   └── server/             # from .next/standalone/.next
├── node_modules/           # minimal, from .next/standalone
├── data/                   # mock dataset, read at boot
└── package.json
```

### 3.2 Copy the artifacts

From your machine:

```bash
rsync -avz --delete .next/standalone/ user@vps:/var/www/senarai/
rsync -avz --delete .next/static/     user@vps:/var/www/senarai/.next/static/
rsync -avz --delete data/             user@vps:/var/www/senarai/data/
```

`data/` must sit beside `server.js`: the dataset is read from disk at startup, and the audit seed is replayed on every boot.

---

## 4. PM2

`ecosystem.config.cjs` in `/var/www/senarai/`:

```js
module.exports = {
  apps: [
    {
      name: 'senarai',
      script: 'server.js',
      cwd: '/var/www/senarai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      max_memory_restart: '400M',
      out_file: '/var/log/senarai/out.log',
      error_file: '/var/log/senarai/error.log',
      time: true,
    },
  ],
};
```

```bash
sudo mkdir -p /var/log/senarai
sudo chown -R $USER:$USER /var/log/senarai
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup            # then run the command it prints
pm2 status             # senarai should be "online"
```

`instances: 1` is deliberate: the store is in memory, so a second instance would hold its own threads and audit log.

---

## 5. Nginx

`/etc/nginx/sites-available/senarai`:

```nginx
server {
    listen 80;
    server_name senarai.example.com;

    # Answer requests are held for a 600ms floor by the app itself; keep the
    # proxy timeout comfortably above that.
    proxy_read_timeout 30s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/senarai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d senarai.example.com     # if you have a domain
```

---

## 6. Environment variables

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Standard Next.js behaviour |
| `PORT` | `3000` | Matches the Nginx upstream |
| `HOSTNAME` | `127.0.0.1` | Keeps the app off the public interface; Nginx is the only entry point |
| `SENARAI_ALLOW_RESET` | `1` for the demo, unset otherwise | Enables `POST /api/reset` in production. Off by default so a deployed instance is not resettable by a stranger. |

No secrets. There are no third-party API keys, no database URL and no model key — composition is deterministic and local.

---

## 7. Health checks

```bash
pm2 status
curl -s -o /dev/null -w "%{http_code}\n" https://senarai.example.com/ask      # 200
curl -s -o /dev/null -w "%{http_code}\n" https://senarai.example.com/audit    # 200
curl -s -o /dev/null -w "%{http_code}\n" https://senarai.example.com/access   # 200
curl -s https://senarai.example.com/api/audit | head -c 200                   # JSON array
```

A functional check, end to end:

```bash
curl -s -X POST https://senarai.example.com/api/ask \
  -H 'content-type: application/json' \
  -H 'cookie: senarai_actor=A1' \
  -d '{"question":"Kenapa stok telat di Makassar?"}'
```

Expect a `threadId`; fetch it with `GET /api/threads/<threadId>` and the same cookie to read the three-part answer.

---

## 8. Update and rollback

### 8.1 Update

```bash
# on the build machine
npm ci && npm test && npm run build
rsync -avz --delete .next/standalone/ user@vps:/var/www/senarai.new/
rsync -avz --delete .next/static/     user@vps:/var/www/senarai.new/.next/static/

# on the VPS
mv /var/www/senarai /var/www/senarai.prev
mv /var/www/senarai.new /var/www/senarai
pm2 restart senarai
```

### 8.2 Rollback

```bash
mv /var/www/senarai /var/www/senarai.broken
mv /var/www/senarai.prev /var/www/senarai
pm2 restart senarai
```

Keep exactly one previous release directory. A restart clears in-memory threads and resets the audit log to `data/audit.seed.json`, so a rollback is clean.

---

## 9. Demo-day notes

- **Reset between rehearsals:** `curl -X POST https://senarai.example.com/api/reset`. Requires `SENARAI_ALLOW_RESET=1` in the PM2 env; without it the endpoint returns 404 by design. Restarting PM2 does the same thing, since all state is in memory.
- **Actor switching** is a cookie (`senarai_actor`), set by the switcher in the sidebar. `A1` = Rina (staff), `A2` = Andi (manager), `A3` = Sari (admin).
- **No warm-up needed.** The build is prebuilt; the only cold cost is Node's module load at boot, which happens before the judge arrives.
- **State is in memory.** Restarting PM2 is the fastest way to return the demo to a known state.

---

## 10. The MCP server

Not deployed. Nothing in this guide changes because of it.

**Why:** the transport is stdio. An MCP client launches the process itself:

```json
{
  "mcpServers": {
    "senarai": {
      "command": "node",
      "args": ["/path/to/Senarai/mcp/dist/server.mjs"],
      "env": { "SENARAI_ACTOR": "A1", "SENARAI_PROJECT": "makassar-q4" }
    }
  }
}
```

That works on a laptop with no network, which is what you want on a demo machine. `/integrations` prints this snippet with the current actor and project already filled in.

**Build it before a demo:**

```bash
npm install
npm run mcp:build      # writes mcp/dist/server.mjs
npm run verify:mcp     # 23 checks over a real handshake
```

**If you ever want it on the VPS,** copy the release directory as usual and point the client's `args` at that absolute path; it needs `node_modules/@modelcontextprotocol/sdk` and `node_modules/zod` beside the bundle, which `npm ci` already installs. There is no port to open and no PM2 entry, because stdio is not a socket.

**What is missing for a remote client:** an SSE or streamable-HTTP endpoint, which would have to live inside the Next.js app (`app/api/mcp/...`) so it could resolve a session from a header rather than a cookie. It is not built. If a judge asks for it, that is the honest answer, and `/integrations` says the same thing on the page.
