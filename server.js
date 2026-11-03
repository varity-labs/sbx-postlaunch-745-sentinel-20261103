import http from 'node:http';
import { Pool } from 'pg';
import { timingSafeEqual } from 'node:crypto';
const version = 'v1';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000, query_timeout: 3000 });
const token = Buffer.from(process.env.SENTINEL_WRITE_TOKEN || '');
http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (process.env.FAIL_START === '1') { res.statusCode = 503; return res.end('{"error":"forced_unhealthy"}'); }
  if (req.url === '/health') return res.end(JSON.stringify({ fixture: 'persistence-sentinel', version }));
  try {
    if (req.method === 'POST' && req.url === '/seed') {
      const supplied = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!token.length || supplied.length !== token.length || !timingSafeEqual(token, supplied)) { res.statusCode = 401; return res.end('{"error":"unauthorized"}'); }
      await pool.query('CREATE TABLE IF NOT EXISTS varity_sentinel (marker text PRIMARY KEY)');
      for (const marker of ['sentinel-one', 'sentinel-two', 'sentinel-three']) await pool.query('INSERT INTO varity_sentinel(marker) VALUES ($1) ON CONFLICT DO NOTHING', [marker]);
    } else if (req.method !== 'GET' || req.url !== '/') { res.statusCode = 404; return res.end('{}'); }
    await pool.query('CREATE TABLE IF NOT EXISTS varity_sentinel (marker text PRIMARY KEY)');
    const data = await pool.query("SELECT marker, tableoid::oid::text AS table_oid FROM varity_sentinel ORDER BY marker");
    res.end(JSON.stringify({ fixture: 'persistence-sentinel', version, envRevision: process.env.ENV_REVISION || 'initial', rows: data.rows }));
  } catch { res.statusCode = 503; res.end('{"error":"database_not_ready"}'); }
}).listen(Number(process.env.PORT || '3000'), '0.0.0.0');
