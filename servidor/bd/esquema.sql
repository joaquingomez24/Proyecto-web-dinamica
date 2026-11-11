-- Base de ASHE (MySQL en Docker). Docker lo ejecuta solo la primera vez que crea el volumen.
SET NAMES utf8mb4;

CREATE TABLE productos (
  id              VARCHAR(40)  PRIMARY KEY,           -- 'atelier-blazer'
  numero          CHAR(2)      NOT NULL,              -- '01'
  nombre          VARCHAR(80)  NOT NULL,
  categoria       VARCHAR(20)  NOT NULL,              -- Clásicas, Deportivas, Premium
  coleccion       VARCHAR(10)  NOT NULL,              -- salt, iron, chalk
  precio          INT UNSIGNED NOT NULL,              -- en pesos argentinos, sin decimales
  precio_anterior INT UNSIGNED NULL,                  -- si está en oferta
  etiqueta        VARCHAR(20)  NULL,                  -- New, Bestseller, Limited, Low stock
  es_nuevo        BOOLEAN      NOT NULL DEFAULT FALSE,
  stock           INT UNSIGNED NULL,                  -- se muestra cuando quedan pocas
  frase           VARCHAR(200) NOT NULL,
  descripcion     TEXT         NOT NULL,
  composicion     VARCHAR(200) NOT NULL,
  calce           VARCHAR(200) NOT NULL,
  cuidado         VARCHAR(200) NOT NULL,
  orden           INT          NOT NULL
);

CREATE TABLE colores (
  producto_id VARCHAR(40) NOT NULL,
  id          VARCHAR(30) NOT NULL,                  -- 'sand'
  nombre      VARCHAR(40) NOT NULL,
  hex         CHAR(7)     NOT NULL,
  fotos       JSON        NOT NULL,                  -- [{ "name": "hero-full", "pos": "50% 30%" }, ...]
  orden       INT         NOT NULL,
  PRIMARY KEY (producto_id, id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE talles (
  producto_id VARCHAR(40) NOT NULL,
  talle       VARCHAR(10) NOT NULL,
  agotado     BOOLEAN     NOT NULL DEFAULT FALSE,
  orden       INT         NOT NULL,
  PRIMARY KEY (producto_id, talle),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE pedidos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email       VARCHAR(150) NOT NULL,
  nombre      VARCHAR(80)  NOT NULL,
  apellido    VARCHAR(80)  NOT NULL,
  direccion   VARCHAR(200) NOT NULL,
  ciudad      VARCHAR(80)  NOT NULL,
  celular     VARCHAR(20)  NOT NULL,                 -- el campo "Mobile" del checkout (en el código se llama postcode)
  zona        VARCHAR(40)  NOT NULL,
  envio       VARCHAR(20)  NOT NULL,                 -- standard, express, atelier
  pago        VARCHAR(10)  NOT NULL,                 -- cod (contra entrega) o card
  tarjeta_ultimos4 CHAR(4) NULL,                     -- de la tarjeta solo se guardan los últimos 4
  subtotal    INT UNSIGNED NOT NULL,
  costo_envio INT UNSIGNED NOT NULL,
  total       INT UNSIGNED NOT NULL
);

CREATE TABLE pedido_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id   INT UNSIGNED NOT NULL,
  producto_id VARCHAR(40)  NOT NULL,
  producto    VARCHAR(80)  NOT NULL,                 -- nombre en el momento de la compra
  color       VARCHAR(40)  NOT NULL,
  talle       VARCHAR(10)  NOT NULL,
  cantidad    TINYINT UNSIGNED NOT NULL,
  precio      INT UNSIGNED NOT NULL,                 -- precio en el momento de la compra
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);
