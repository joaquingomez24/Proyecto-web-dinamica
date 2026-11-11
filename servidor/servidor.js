// API de ASHE: catálogo y pedidos en MySQL (Docker, base ashe_db, puerto 3308).
// El front (Vite, `npm run dev`) le pasa los pedidos a /api con su proxy (vite.config.ts).
const express = require('express');
const { pool, esperarBase } = require('./bd/conexion');

const PUERTO = Number(process.env.PORT) || 3005;
const ENVIO_GRATIS_DESDE = 3000; // igual que FREE_SHIPPING en src/data/catalog.ts
const ENVIOS = { standard: 90, express: 90, atelier: 0 };

const app = express();
app.use(express.json({ limit: '50kb' }));

// Un error de MySQL responde 500 en vez de tirar el servidor
const atrapar = (fn) => (req, res, next) => fn(req, res, next).catch((e) => {
  console.error(req.method, req.path, e.message);
  res.status(500).json({ error: 'base de datos' });
});

// Catálogo con la misma forma que `products` de src/data/catalog.ts
async function leerProductos() {
  const [productos] = await pool.query('SELECT * FROM productos ORDER BY orden');
  const [colores] = await pool.query('SELECT * FROM colores ORDER BY producto_id, orden');
  const [talles] = await pool.query('SELECT * FROM talles ORDER BY producto_id, orden');
  return productos.map((p) => {
    const suyos = talles.filter((t) => t.producto_id === p.id);
    const producto = {
      id: p.id,
      no: p.numero,
      name: p.nombre,
      category: p.categoria,
      collection: p.coleccion,
      price: p.precio,
      colours: colores
        .filter((c) => c.producto_id === p.id)
        .map((c) => ({ id: c.id, label: c.nombre, hex: c.hex, shots: typeof c.fotos === 'string' ? JSON.parse(c.fotos) : c.fotos })),
      sizes: suyos.map((t) => t.talle),
      line: p.frase,
      description: p.descripcion,
      composition: p.composicion,
      fit: p.calce,
      care: p.cuidado,
    };
    // Los campos opcionales van solo si tienen valor (como en catalog.ts)
    if (p.precio_anterior != null) producto.was = p.precio_anterior;
    if (p.etiqueta) producto.badge = p.etiqueta;
    if (p.es_nuevo) producto.isNew = true;
    if (p.stock != null) producto.stock = p.stock;
    const agotados = suyos.filter((t) => t.agotado).map((t) => t.talle);
    if (agotados.length) producto.soldOut = agotados;
    return producto;
  }).filter((p) => p.colours.length && p.sizes.length); // los viejos con pedidos quedan sin colores ni talles: no se muestran
}

app.get('/api/productos', atrapar(async (req, res) => res.json(await leerProductos())));

app.get('/api/productos/:id', atrapar(async (req, res) => {
  const p = (await leerProductos()).find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'no existe' });
  res.json(p);
}));

// Crear un pedido: los precios se calculan acá, nunca se confía en lo que manda el navegador
app.post('/api/pedidos', atrapar(async (req, res) => {
  const { cliente = {}, envio, pago, tarjeta = '', items = [] } = req.body || {};
  const t = (v, max) => String(v || '').trim().slice(0, max);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email || '')) return res.status(400).json({ error: 'email' });
  for (const campo of ['first', 'last', 'address', 'city', 'postcode', 'country']) {
    if (!t(cliente[campo], 200)) return res.status(400).json({ error: campo });
  }
  if (!(envio in ENVIOS) || !['cod', 'card'].includes(pago)) return res.status(400).json({ error: 'envío o pago' });
  if (!Array.isArray(items) || !items.length || items.length > 30) return res.status(400).json({ error: 'carrito' });

  const productos = await leerProductos();
  const lineas = [];
  for (const it of items) {
    const p = productos.find((x) => x.id === it.productId);
    const color = p && p.colours.find((c) => c.id === it.colourId);
    const cantidad = Math.floor(Number(it.qty));
    if (!p || !color || !p.sizes.includes(it.size) || (p.soldOut || []).includes(it.size) || !(cantidad >= 1 && cantidad <= 9)) {
      return res.status(400).json({ error: 'producto', item: it });
    }
    lineas.push({ p, color, talle: it.size, cantidad });
  }
  const subtotal = lineas.reduce((n, l) => n + l.p.price * l.cantidad, 0);
  const costoEnvio = envio === 'atelier' || subtotal >= ENVIO_GRATIS_DESDE ? 0 : ENVIOS[envio];
  const numero = String(tarjeta).replace(/\D/g, '');
  if (pago === 'card' && numero.length < 12) return res.status(400).json({ error: 'tarjeta' });

  const c = await pool.getConnection();
  let id;
  try {
    await c.beginTransaction();
    const [r] = await c.query(
      `INSERT INTO pedidos (email, nombre, apellido, direccion, ciudad, celular, zona, envio, pago, tarjeta_ultimos4,
         subtotal, costo_envio, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t(cliente.email, 150), t(cliente.first, 80), t(cliente.last, 80), t(cliente.address, 200), t(cliente.city, 80),
        t(cliente.postcode, 20), t(cliente.country, 40), envio, pago, pago === 'card' ? numero.slice(-4) : null,
        subtotal, costoEnvio, subtotal + costoEnvio],
    );
    id = r.insertId;
    for (const l of lineas) {
      await c.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, producto, color, talle, cantidad, precio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, l.p.id, l.p.name, l.color.label, l.talle, l.cantidad, l.p.price],
      );
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
  const no = 'ASHE-' + String(id).padStart(5, '0');
  console.log(`Pedido ${no}: ${lineas.length} líneas, total $ ${subtotal + costoEnvio}`);
  res.status(201).json({ no, total: subtotal + costoEnvio, subtotal, envio: costoEnvio });
}));

// Lista de pedidos (para mirar desde el navegador o la clase; solo escucha en 127.0.0.1)
app.get('/api/pedidos', atrapar(async (req, res) => {
  const [pedidos] = await pool.query(
    `SELECT p.id, p.fecha, p.email, CONCAT(p.nombre, ' ', p.apellido) AS cliente, p.envio, p.pago, p.total,
            GROUP_CONCAT(CONCAT(i.cantidad, ' × ', i.producto, ' (', i.color, ', ', i.talle, ')') SEPARATOR ' | ') AS items
       FROM pedidos p JOIN pedido_items i ON i.pedido_id = p.id
      GROUP BY p.id ORDER BY p.id DESC`,
  );
  res.json(pedidos.map((p) => ({ ...p, no: 'ASHE-' + String(p.id).padStart(5, '0') })));
}));

// ---------- Panel simple para ver pedidos y productos (como el /admin de ATHLETICS) ----------

app.get('/admin', atrapar(async (req, res) => {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const plata = (n) => '$ ' + new Intl.NumberFormat('es-AR').format(n);
  const fecha = (d) => new Date(d).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [pedidos] = await pool.query(
    `SELECT p.*, GROUP_CONCAT(CONCAT(i.cantidad, ' × ', i.producto, ' (', i.color, ', ', i.talle, ') ', i.precio)
              ORDER BY i.id SEPARATOR '\n') AS items
       FROM pedidos p JOIN pedido_items i ON i.pedido_id = p.id GROUP BY p.id ORDER BY p.id DESC`,
  );
  const [productos] = await pool.query(
    `SELECT p.id, p.numero, p.nombre, p.categoria, p.precio, p.precio_anterior, p.stock,
            GROUP_CONCAT(CASE WHEN t.agotado THEN t.talle END ORDER BY t.orden) AS agotados
       FROM productos p LEFT JOIN talles t ON t.producto_id = p.id GROUP BY p.id ORDER BY p.orden`,
  );
  res.send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ASHE · Panel local</title>
<style>body{font:15px system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:24px 16px;color:#121110;background:#f3f0ea}
h1{letter-spacing:.1em}table{border-collapse:collapse;width:100%;margin:12px 0 40px;background:#fff}
th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{background:#eae6df}small{color:#666}code{background:#eae6df;padding:1px 4px}</style>
<h1>ASHE · Panel local</h1>
<p style="color:#666">Datos de MySQL: base <code>ashe_db</code> en el contenedor Docker <code>ashe-mysql</code> (127.0.0.1:3308). Recargá para ver pedidos nuevos. <a href="/">← Volver a la tienda</a></p>
<h2>Pedidos (${pedidos.length})</h2>
<table><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Productos</th><th>Total</th></tr>
${pedidos.map((p) => `<tr><td>ASHE-${String(p.id).padStart(5, '0')}</td><td>${esc(fecha(p.fecha))}</td>
<td>${esc(p.nombre)} ${esc(p.apellido)}<br><small>${esc(p.email)}<br>${esc(p.celular)}</small></td>
<td>${esc(p.direccion)}, ${esc(p.ciudad)} (${esc(p.zona)})<br><small>envío ${esc(p.envio)} · pago ${p.pago === 'card' ? 'tarjeta •••• ' + esc(p.tarjeta_ultimos4) : 'contra entrega'}</small></td>
<td>${esc(p.items).replace(/\n/g, '<br>')}</td>
<td>${plata(p.total)}<br><small>envío ${plata(p.costo_envio)}</small></td></tr>`).join('') || '<tr><td colspan="6">Todavía no hay pedidos.</td></tr>'}</table>
<h2>Productos (${productos.length})</h2>
<table><tr><th>N°</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Talles agotados</th></tr>
${productos.map((p) => `<tr><td>${esc(p.numero)}</td><td>${esc(p.nombre)}<br><small>${esc(p.id)}</small></td><td>${esc(p.categoria)}</td>
<td>${plata(p.precio)}${p.precio_anterior ? `<br><small>antes ${plata(p.precio_anterior)}</small>` : ''}</td>
<td>${p.stock ?? '—'}</td><td>${esc(p.agotados || '—')}</td></tr>`).join('')}</table></html>`);
}));

(async () => {
  if (!process.env.MYSQL_USER) {
    console.error('Faltan los datos de la base: arrancá con "npm start" dentro de servidor/ (lee ../.env).');
    process.exit(1);
  }
  try {
    await esperarBase();
  } catch (e) {
    console.error(`No se pudo conectar a MySQL en ${process.env.DB_HOST}:${process.env.DB_PORT} (${e.code || e.message}).`);
    console.error('¿Está prendido Docker Desktop? Probá: npm run base:prender');
    process.exit(1);
  }
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM productos');
  if (!n) console.warn('La base está vacía: corré "npm run cargar-datos".');
  app.listen(PUERTO, '127.0.0.1', () => console.log(`API de ASHE en http://127.0.0.1:${PUERTO}/api/productos (${n} productos en MySQL)`));
})();
