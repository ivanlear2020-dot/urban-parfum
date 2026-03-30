const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const db = require('../db');

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
const TOKEN_TTL = 8 * 60 * 60 * 1000;  // 8 horas

// ── Limpieza periódica de tokens expirados ────────────────
setInterval(() => {
  db.prepare('DELETE FROM admin_tokens WHERE expires_at < ?').run(Date.now());
}, 60 * 60 * 1000);

// ── Auth middleware ───────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const row = db.prepare('SELECT expires_at FROM admin_tokens WHERE token = ?').get(token);
  if (!row || Date.now() > row.expires_at) {
    if (row) db.prepare('DELETE FROM admin_tokens WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Sesión expirada' });
  }
  next();
}

// ── Rate limiting helper ──────────────────────────────────
function checkRateLimit(ip) {
  const now = Date.now();
  let row = db.prepare('SELECT * FROM login_attempts WHERE ip = ?').get(ip);

  if (!row) {
    db.prepare('INSERT INTO login_attempts (ip, count, blocked_until, last_attempt) VALUES (?, 0, 0, ?)').run(ip, now);
    row = { ip, count: 0, blocked_until: 0, last_attempt: now };
  }

  if (now < row.blocked_until) {
    const mins = Math.ceil((row.blocked_until - now) / 60000);
    return { blocked: true, message: `Demasiados intentos. Intentá en ${mins} minuto${mins > 1 ? 's' : ''}.` };
  }

  return { blocked: false, row };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const row = db.prepare('SELECT * FROM login_attempts WHERE ip = ?').get(ip);
  const newCount = (row?.count || 0) + 1;
  const blockedUntil = newCount >= MAX_ATTEMPTS ? now + BLOCK_DURATION : 0;

  db.prepare(`
    INSERT INTO login_attempts (ip, count, blocked_until, last_attempt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET count=?, blocked_until=?, last_attempt=?
  `).run(ip, newCount, blockedUntil, now, newCount, blockedUntil, now);
}

function clearAttempts(ip) {
  db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
}

// ── POST /admin/login ─────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado en .env' });
  }

  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    return res.status(429).json({ error: limit.message });
  }

  if (!password || password !== adminPassword) {
    recordFailedAttempt(ip);
    const row = db.prepare('SELECT count FROM login_attempts WHERE ip = ?').get(ip);
    const remaining = MAX_ATTEMPTS - (row?.count || 0);
    return res.status(401).json({
      error: remaining > 0
        ? `Contraseña incorrecta. ${remaining} intento${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.`
        : 'Cuenta bloqueada por 15 minutos.'
    });
  }

  clearAttempts(ip);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL;
  db.prepare('INSERT INTO admin_tokens (token, expires_at) VALUES (?, ?)').run(token, expiresAt);

  res.json({ token, expires_at: expiresAt });
});

// ── GET /api/admin/ordenes ────────────────────────────────
router.get('/api/admin/ordenes', authMiddleware, (req, res) => {
  const ordenes = db.prepare('SELECT * FROM ordenes ORDER BY created_at DESC').all();
  const result = ordenes.map(o => ({
    ...o,
    items: (() => { try { return JSON.parse(o.items || '[]'); } catch { return []; } })(),
  }));
  res.json(result);
});

// ── PATCH /api/admin/ordenes/:id/estado ──────────────────
router.patch('/api/admin/ordenes/:id/estado', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const estadosValidos = ['pending', 'approved', 'rejected', 'in_process'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  db.prepare('UPDATE ordenes SET estado = ? WHERE id = ?').run(estado, id);
  res.json({ ok: true });
});

// ── GET /admin/ordenes ────────────────────────────────────
router.get('/admin/ordenes', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/ordenes.html'));
});

// ── GET /admin/productos ──────────────────────────────────
router.get('/admin/productos', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/productos.html'));
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
