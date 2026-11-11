// Pool de conexiones a MySQL (Docker, puerto 3308). Los datos salen de ../.env (node --env-file).
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Espera a que MySQL acepte conexiones (por si el contenedor recién arranca)
async function esperarBase(intentos = 20) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      if (i === intentos) throw e;
      console.log(`Esperando a MySQL (${e.code || e.message})...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

module.exports = { pool, esperarBase };
