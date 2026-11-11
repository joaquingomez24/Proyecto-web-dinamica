// Pasa los productos de src/data/catalog.ts a MySQL (borra y vuelve a cargar productos, colores y talles;
// los pedidos no se tocan). Uso: npm run cargar-datos
import { createRequire } from 'node:module';
import { products } from '../../src/data/catalog.ts';

const { pool, esperarBase } = createRequire(import.meta.url)('./conexion.js');

await esperarBase();
const c = await pool.getConnection();
try {
  await c.beginTransaction();
  // Los productos con pedidos no se pueden borrar: se actualizan; los demás se reemplazan
  await c.query('DELETE FROM colores');
  await c.query('DELETE FROM talles');
  for (const [i, p] of products.entries()) {
    await c.query(
      `INSERT INTO productos (id, numero, nombre, categoria, coleccion, precio, precio_anterior, etiqueta, es_nuevo, stock,
         frase, descripcion, composicion, calce, cuidado, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE numero=VALUES(numero), nombre=VALUES(nombre), categoria=VALUES(categoria),
         coleccion=VALUES(coleccion), precio=VALUES(precio), precio_anterior=VALUES(precio_anterior),
         etiqueta=VALUES(etiqueta), es_nuevo=VALUES(es_nuevo), stock=VALUES(stock), frase=VALUES(frase),
         descripcion=VALUES(descripcion), composicion=VALUES(composicion), calce=VALUES(calce),
         cuidado=VALUES(cuidado), orden=VALUES(orden)`,
      [p.id, p.no, p.name, p.category, p.collection, p.price, p.was ?? null, p.badge ?? null, !!p.isNew, p.stock ?? null,
        p.line, p.description, p.composition, p.fit, p.care, i],
    );
    for (const [j, col] of p.colours.entries()) {
      await c.query('INSERT INTO colores (producto_id, id, nombre, hex, fotos, orden) VALUES (?, ?, ?, ?, ?, ?)', [
        p.id, col.id, col.label, col.hex, JSON.stringify(col.shots), j,
      ]);
    }
    for (const [j, talle] of p.sizes.entries()) {
      await c.query('INSERT INTO talles (producto_id, talle, agotado, orden) VALUES (?, ?, ?, ?)', [
        p.id, talle, (p.soldOut || []).includes(talle), j,
      ]);
    }
  }
  // Saca de la base los productos viejos que ya no están en catalog.ts (salvo los que tienen pedidos)
  await c.query('DELETE FROM productos WHERE id NOT IN (?) AND id NOT IN (SELECT producto_id FROM pedido_items)', [products.map((p) => p.id)]);
  await c.commit();
  console.log(`Cargados ${products.length} productos en MySQL.`);
} catch (e) {
  await c.rollback();
  throw e;
} finally {
  c.release();
  await pool.end();
}
