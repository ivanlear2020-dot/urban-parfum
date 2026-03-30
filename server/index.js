require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Seed automático de productos (solo si la tabla está vacía)
const db = require('./db');
const seedCount = db.prepare('SELECT COUNT(*) as c FROM productos').get();
if (seedCount.c === 0) {
  try {
    require('./seed');
  } catch (e) {
    console.warn('Seed omitido:', e.message);
  }
}

// Rutas API (ANTES que los archivos estáticos)
const paymentRoutes  = require('./routes/payment');
const webhookRoutes  = require('./routes/webhook');
const adminRoutes    = require('./routes/admin');
const productosRoutes = require('./routes/productos');

app.use('/', paymentRoutes);
app.use('/', webhookRoutes);
app.use('/', adminRoutes);
app.use('/', productosRoutes);

// Servir archivos estáticos del frontend (DESPUÉS de las rutas API)
app.use(express.static(path.join(__dirname, '..')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor Urban Parfum corriendo en http://localhost:${PORT}`);
  console.log(`   - POST /create_preference`);
  console.log(`   - POST /webhook`);
  console.log(`   - POST /admin/login`);
  console.log(`   - GET  /api/productos`);
  console.log(`   - GET  /admin/ordenes`);
  console.log(`   - GET  /admin/productos`);
});
