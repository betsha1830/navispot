import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const internalPort = Number(process.env.INTERNAL_PORT || 3001);
const httpsPort = Number(process.env.HTTPS_PORT || 3000);
const certPath = process.env.SSL_CERT_PATH || '/certs/cert.pem';
const keyPath = process.env.SSL_KEY_PATH || '/certs/key.pem';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function forwardedHeaders(source) {
  const headers = {};
  for (const [name, value] of Object.entries(source)) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) headers[name] = value;
  }
  headers['x-forwarded-proto'] = 'https';
  if (source.host) headers['x-forwarded-host'] = source.host;
  return headers;
}

function waitForPort(port, host, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, host, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Next.js did not listen on ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

const next = spawn(process.execPath, ['server.js'], {
  cwd: '/app',
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(internalPort),
    HOSTNAME: '127.0.0.1',
  },
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  next.kill(signal);
}

next.on('exit', (code) => {
  process.exit(shuttingDown ? 0 : (code ?? 1));
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const server = https.createServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  (req, res) => {
    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: internalPort,
        path: req.url,
        method: req.method,
        headers: forwardedHeaders(req.headers),
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Upstream unavailable');
    });

    req.pipe(proxyReq);
  },
);

await waitForPort(internalPort, '127.0.0.1', 30000);
server.listen(httpsPort, '0.0.0.0', () => {
  console.log(`HTTPS listening on 0.0.0.0:${httpsPort}`);
});
