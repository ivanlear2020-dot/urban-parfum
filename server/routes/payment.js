const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('../db');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// POST /create_preference
// Recibe: { items: [{id, name, price, qty}], payer: {name, email, phone} }
router.post('/create_preference', async (req, res) => {
  try {
    const { items, payer } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    // Validar items contra la base de datos (evita manipulación de precios desde el frontend)
    const validatedItems = [];
    for (const item of items) {
      const product = db.prepare('SELECT id, name, price FROM productos WHERE id = ? AND active = 1').get(item.id);
      if (!product) {
        return res.status(400).json({ error: `Producto no disponible` });
      }
      const qty = Math.max(1, Math.min(10, parseInt(item.qty) || 1));
      validatedItems.push({ id: product.id, name: product.name, price: product.price, qty });
    }

    const total = validatedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    const mpItems = validatedItems.map(item => ({
      id: String(item.id),
      title: item.name,
      quantity: item.qty,
      unit_price: item.price,
      currency_id: 'ARS',
    }));

    const baseUrl = process.env.BASE_URL;
    const isRealUrl = baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');

    const prefBody = {
      items: mpItems,
      payer: payer ? {
        name: payer.name,
        email: payer.email,
        phone: payer.phone ? { number: payer.phone } : undefined,
      } : undefined,
      statement_descriptor: 'URBAN PARFUM',
    };

    if (isRealUrl) {
      prefBody.back_urls = {
        success: `${baseUrl}/?status=success`,
        failure: `${baseUrl}/?status=failure`,
        pending: `${baseUrl}/?status=pending`,
      };
      prefBody.auto_return = 'approved';
    }

    const preference = new Preference(client);
    const result = await preference.create({ body: prefBody });

    // Guardar orden en BD con precios validados
    db.prepare(`
      INSERT INTO ordenes (preference_id, estado, comprador_nombre, comprador_email, comprador_tel, items, total)
      VALUES (?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      result.id,
      payer?.name || '',
      payer?.email || '',
      payer?.phone || '',
      JSON.stringify(validatedItems),
      total
    );

    res.json({
      preference_id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (err) {
    console.error('Error creando preferencia:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint legado redirigido al panel admin
router.get('/ordenes', (req, res) => {
  res.redirect('/admin/ordenes');
});

module.exports = router;
