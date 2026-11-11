// Prueba de punta a punta (precio desde MySQL, carrito, checkout, pedido guardado). Uso: node --env-file=../.env prueba-bd.js
const puppeteer = require('puppeteer-core');
const { pool } = require('./bd/conexion');
const BASE = 'http://127.0.0.1:5179';
(async () => {
  let ok = 0, total = 0;
  const chequear = (n, c, d = '') => { total++; ok += !!c; console.log((c ? 'OK   ' : 'MAL  ') + n + (d ? '  → ' + d : '')); };
  const [[antes]] = await pool.query("SELECT precio FROM productos WHERE id='heavy-tee'");
  await pool.query("UPDATE productos SET precio=1333 WHERE id='heavy-tee'");
  const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const p = await nav.newPage();
    const logs = [];
    p.on('console', (m) => logs.push(m.text()));
    p.on('pageerror', (e) => logs.push('ERROR js: ' + e.message));
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await p.evaluate(() => localStorage.setItem('ashe.bag.v2', JSON.stringify([{ key: 'heavy-tee|bone|M', productId: 'heavy-tee', colourId: 'bone', size: 'M', qty: 2 }])));
    await p.goto(BASE + '/#/piece/heavy-tee', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2500));
    chequear('catálogo cargado desde MySQL', logs.some((l) => /productos desde MySQL/.test(l)), logs.find((l) => /ASHE:/.test(l)));
    const texto = await p.evaluate(() => document.body.innerText);
    chequear('muestra el precio cambiado en la base ($ 1.333)', /\$ 1\.333/.test(texto));
    await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await p.click('.nav__bag');
    await new Promise((r) => setTimeout(r, 1200));
    await p.click('.bag__checkout');
    await new Promise((r) => setTimeout(r, 1500));
    const datos = { email: 'alumno@epet20.edu.ar', first: 'Ana', last: 'Pérez', address: 'Av. Siempre Viva 742', city: 'Neuquén', postcode: '01012345678' };
    for (const [k, v] of Object.entries(datos)) await p.type(`.co [name="${k}"]`, v);
    p.on('response', (r) => r.url().includes('/api/pedidos') && r.text().then((t) => console.log('API', r.status(), t)));
    await p.click('.co__submit');
    await new Promise((r) => setTimeout(r, 3000));
    const conf = await p.evaluate(() => document.querySelector('.co')?.innerText || '');
    console.log('errores del form:', await p.$$eval('.co__err', (l) => l.map((e) => e.textContent)));
    const no = (conf.match(/ASHE-\d{5}/) || [])[0];
    chequear('confirmación con número de pedido', !!no, no);
    const [[ped]] = await pool.query('SELECT * FROM pedidos ORDER BY id DESC LIMIT 1');
    const [items] = await pool.query('SELECT * FROM pedido_items WHERE pedido_id=?', [ped.id]);
    chequear('pedido guardado en MySQL', ped && ped.email === datos.email && 'ASHE-' + String(ped.id).padStart(5, '0') === no, `${ped.nombre} ${ped.apellido}, total ${ped.total}`);
    chequear('item con precio de la base', items.length === 1 && items[0].precio === 1333 && items[0].cantidad === 2 && items[0].talle === 'M', JSON.stringify(items.map((i) => [i.producto, i.color, i.talle, i.cantidad, i.precio])));
    chequear('total calculado en el servidor (2 × 1333 + envío 90)', ped.total === 2756, String(ped.total));
    chequear('carrito vacío después de comprar', (await p.evaluate(() => localStorage.getItem('ashe.bag.v2'))) === '[]');
    const errs = logs.filter((l) => /ERROR|Failed/.test(l));
    chequear('sin errores en la consola', !errs.length, errs.join(' | '));
    const panel = await (await fetch(BASE + '/admin')).text();
    chequear('el panel /admin muestra el pedido', panel.includes(no) && panel.includes('Ana') && panel.includes('Heavy Tee'));
    // limpiar el pedido de prueba
    await pool.query('DELETE FROM pedidos WHERE id=?', [ped.id]);
  } finally {
    await pool.query("UPDATE productos SET precio=? WHERE id='heavy-tee'", [antes.precio]);
    await nav.close();
    await pool.end();
  }
  console.log(`\n${ok}/${total}`);
})();
