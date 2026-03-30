const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('./admin');

// GET /api/productos — público (solo activos)
router.get('/api/productos', (req, res) => {
  const rows = db.prepare('SELECT * FROM productos WHERE active = 1 ORDER BY id ASC').all();
  res.json(rows);
});

// GET /api/admin/productos-all — todos (protegido)
router.get('/api/admin/productos-all', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM productos ORDER BY id DESC').all();
  res.json(rows);
});

// GET /api/productos/featured — público
router.get('/api/productos/featured', (req, res) => {
  const rows = db.prepare('SELECT * FROM productos WHERE active = 1 AND featured = 1 ORDER BY id ASC').all();
  res.json(rows);
});

// POST /api/admin/productos — crear (protegido)
router.post('/api/admin/productos', authMiddleware, (req, res) => {
  const { name, brand, price, image, description, featured } = req.body;
  if (!name || !brand || price == null) {
    return res.status(400).json({ error: 'name, brand y price son requeridos' });
  }
  const result = db.prepare(`
    INSERT INTO productos (name, brand, price, image, description, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(name, brand, Number(price), image || '', description || '', featured ? 1 : 0);

  const product = db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid);
  res.json(product);
});

// PUT /api/admin/productos/:id — editar (protegido)
router.put('/api/admin/productos/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, brand, price, image, description, featured, active } = req.body;
  if (!name || !brand || price == null) {
    return res.status(400).json({ error: 'name, brand y price son requeridos' });
  }
  db.prepare(`
    UPDATE productos SET name=?, brand=?, price=?, image=?, description=?, featured=?, active=?
    WHERE id=?
  `).run(name, brand, Number(price), image || '', description || '', featured ? 1 : 0, active != null ? (active ? 1 : 0) : 1, id);

  const product = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

// DELETE /api/admin/productos/:id — desactivar (soft delete, protegido)
router.delete('/api/admin/productos/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE productos SET active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
