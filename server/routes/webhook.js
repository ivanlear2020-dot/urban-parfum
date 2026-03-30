const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');
const db = require('../db');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ── Transporter de email (configurable por .env) ──────────
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── POST /webhook ─────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log('Webhook recibido:', type, data);

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      const estado = paymentData.status;
      const preferenceId = paymentData.preference_id;

      db.prepare(`
        UPDATE ordenes SET estado = ?, payment_id = ? WHERE preference_id = ?
      `).run(estado, String(paymentId), preferenceId);

      if (estado === 'approved') {
        const orden = db.prepare('SELECT * FROM ordenes WHERE preference_id = ?').get(preferenceId);
        if (orden) {
          await Promise.allSettled([
            notificarVendedor(orden, paymentData),
            enviarEmailComprador(orden),
          ]);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err);
    res.sendStatus(200);
  }
});

// ── Notificación WhatsApp al vendedor ────────────────────
async function notificarVendedor(orden, paymentData) {
  try {
    const items = JSON.parse(orden.items || '[]');
    const productosTexto = items.map(i => `• ${i.name} x${i.qty} — $${Number(i.price).toLocaleString('es-AR')}`).join('\n');

    const mensaje =
      `🎉 *VENTA CONFIRMADA — Urban Parfum*\n\n` +
      `👤 *Comprador:* ${orden.comprador_nombre || 'Sin nombre'}\n` +
      `📧 *Email:* ${orden.comprador_email || 'No indicado'}\n` +
      `📱 *Tel:* ${orden.comprador_tel || 'No indicado'}\n\n` +
      `📦 *Productos:*\n${productosTexto}\n\n` +
      `💰 *Total:* $${Number(orden.total).toLocaleString('es-AR')}\n` +
      `🆔 *Pago ID:* ${paymentData.id}\n` +
      `📅 *Fecha:* ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`;

    const response = await fetch('http://localhost:18789/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OC_TOKEN || ''}`,
      },
      body: JSON.stringify({
        channel: 'whatsapp',
        to: process.env.WA_NOTIFY_NUMBER,
        message: mensaje,
      }),
    });
    console.log('Notificación WA enviada:', response.status);
  } catch (err) {
    console.error('Error enviando notificación WA:', err.message);
  }
}

// ── Email de confirmación al comprador ───────────────────
async function enviarEmailComprador(orden) {
  if (!orden.comprador_email) return;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email no configurado (SMTP_HOST/SMTP_USER faltantes en .env)');
    return;
  }

  try {
    const items = JSON.parse(orden.items || '[]');
    const total = Number(orden.total).toLocaleString('es-AR');

    const itemsHtml = items.map(i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#e8edf5">${i.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#7a8aaa;text-align:center">${i.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e2d4a;color:#c87941;text-align:right;white-space:nowrap">$${Number(i.price * i.qty).toLocaleString('es-AR')}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080e1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080e1a;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0d1526;border-radius:16px;border:1px solid #1e2d4a;overflow:hidden;max-width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d1526 0%,#111d33 100%);padding:40px 40px 30px;text-align:center;border-bottom:2px solid #c87941">
            <p style="font-size:28px;font-weight:700;color:#c87941;letter-spacing:4px;margin:0">URBAN PARFUM</p>
            <p style="color:#7a8aaa;font-size:12px;letter-spacing:2px;margin:8px 0 0;text-transform:uppercase">Signature Essence</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="color:#c87941;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Confirmación de compra</p>
            <h1 style="color:#e8edf5;font-size:26px;margin:0 0 20px;font-weight:400">¡Gracias por tu compra, ${orden.comprador_nombre || 'cliente'}!</h1>
            <p style="color:#7a8aaa;line-height:1.7;margin:0 0 32px">Tu pago fue aprobado exitosamente. En breve nos comunicamos con vos para coordinar el envío.</p>

            <!-- Productos -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <thead>
                <tr>
                  <th style="text-align:left;color:#7a8aaa;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1e2d4a">Producto</th>
                  <th style="text-align:center;color:#7a8aaa;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1e2d4a">Cant.</th>
                  <th style="text-align:right;color:#7a8aaa;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #1e2d4a">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
              <tr>
                <td style="color:#7a8aaa;font-size:14px">Total abonado</td>
                <td style="text-align:right;color:#c87941;font-size:22px;font-weight:700">$${total}</td>
              </tr>
            </table>

            <!-- Info envío -->
            <div style="background:#111d33;border:1px solid #1e2d4a;border-radius:10px;padding:20px;margin-bottom:32px">
              <p style="color:#c87941;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px">Próximos pasos</p>
              <p style="color:#e8edf5;font-size:14px;line-height:1.7;margin:0">
                Te contactaremos por WhatsApp al número que indicaste para coordinar la entrega.
                El envío es <strong style="color:#c87941">gratuito</strong> a todo el país.
              </p>
            </div>

            <!-- WhatsApp CTA -->
            <div style="text-align:center">
              <a href="https://wa.me/5491156914557" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.5px">
                Consultar por WhatsApp
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1e2d4a;text-align:center">
            <p style="color:#7a8aaa;font-size:12px;margin:0">© 2026 Urban Parfum · Buenos Aires, Argentina</p>
            <p style="color:#4a5a7a;font-size:11px;margin:6px 0 0">ventas@urbanparfum.ar</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Urban Parfum" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: orden.comprador_email,
      subject: `✅ Compra confirmada — Urban Parfum`,
      html,
    });

    console.log(`📧 Email de confirmación enviado a ${orden.comprador_email}`);
  } catch (err) {
    console.error('Error enviando email:', err.message);
  }
}

module.exports = router;
