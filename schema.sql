-- Silent Hill Hospital website: MySQL 8 schema
-- Mirrors the data the site keeps today in data/db.json.
-- Run it in Railway: MySQL service -> Data -> Query, or:  mysql ... railway < schema.sql

SET NAMES utf8mb4;

/* ---------- staff accounts ---------- */
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(16)  PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  role          ENUM('admin','editor','reception') NOT NULL DEFAULT 'reception',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  password_salt CHAR(32)     NOT NULL,
  password_hash CHAR(128)    NOT NULL,        -- scrypt hash, never the plain password
  last_login    DATETIME(3)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- site settings (contact details, hero text, social links...) ---------- */
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(64) PRIMARY KEY,      -- e.g. name, phone, whatsapp, facebook, tiktok
  setting_value TEXT        NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- content managed in the admin ---------- */
CREATE TABLE IF NOT EXISTS services (
  id         VARCHAR(16)  PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  category   ENUM('maternity','child','general','diagnostics','emergency') NOT NULL DEFAULT 'general',
  icon       VARCHAR(16)  NULL,
  summary    TEXT         NULL,
  covers     JSON         NULL,               -- ["item", ...]  what it covers
  steps      JSON         NULL,               -- [{"title":"...","text":"..."}]  steps we walk with you
  image      VARCHAR(500) NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  featured   TINYINT(1)   NOT NULL DEFAULT 0,
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_services_public (published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blogs (
  id         VARCHAR(16)  PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  excerpt    TEXT         NULL,
  body       MEDIUMTEXT   NULL,
  author     VARCHAR(120) NULL,
  image      VARCHAR(500) NULL,
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_blogs_public (published, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id          VARCHAR(16)  PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  type        VARCHAR(80)  NULL,               -- Baby shower, Mother education, ...
  event_date  DATE         NOT NULL,
  time_text   VARCHAR(80)  NULL,               -- "10:00 AM - 1:00 PM"
  venue       VARCHAR(200) NULL,
  description TEXT         NULL,
  image       VARCHAR(500) NULL,
  capacity    INT          NOT NULL DEFAULT 0, -- 0 = unlimited
  published   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_events_date (published, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vouchers (
  id             VARCHAR(16)   PRIMARY KEY,
  title          VARCHAR(200)  NOT NULL,
  headline       VARCHAR(200)  NULL,           -- used only when there is no discount value
  description    TEXT          NULL,
  terms          TEXT          NULL,
  currency       CHAR(3)       NOT NULL DEFAULT 'KES',
  price          DECIMAL(12,2) NOT NULL DEFAULT 0,        -- regular price
  discount_type  ENUM('percent','amount') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  slots          INT           NOT NULL DEFAULT 0,        -- people allowed, 0 = unlimited
  opens_at       DATE          NULL,                      -- claiming opens on this date
  expires        DATE          NULL,                      -- claiming closes after this date
  active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_voucher_discount CHECK (discount_value >= 0 AND slots >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS insurers (
  id         VARCHAR(16)  PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  status     ENUM('accredited','accepted','coming') NOT NULL DEFAULT 'coming',
  note       VARCHAR(200) NULL,
  logo       VARCHAR(500) NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gallery (
  id         VARCHAR(16)  PRIMARY KEY,
  caption    VARCHAR(200) NULL,
  category   VARCHAR(80)  NULL,
  image      VARCHAR(500) NOT NULL,
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_items (          -- WhatsApp catalog
  id          VARCHAR(16)  PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  price_text  VARCHAR(80)  NULL,
  category    VARCHAR(80)  NULL,
  description TEXT         NULL,
  image       VARCHAR(500) NULL,
  available   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- things visitors send in ---------- */
CREATE TABLE IF NOT EXISTS bookings (
  id         VARCHAR(16)  PRIMARY KEY,
  ref        VARCHAR(16)  NOT NULL UNIQUE,        -- ticket reference, e.g. BK-DB4079A9
  name       VARCHAR(120) NOT NULL,
  phone      VARCHAR(30)  NOT NULL,
  email      VARCHAR(120) NULL,
  service    VARCHAR(200) NOT NULL,
  book_date  DATE         NOT NULL,
  book_time  VARCHAR(20)  NULL,
  notes      TEXT         NULL,
  status     ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  admin_note TEXT         NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_bookings_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inquiries (
  id         VARCHAR(16)  PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  phone      VARCHAR(30)  NULL,
  email      VARCHAR(120) NULL,
  message    TEXT         NOT NULL,
  status     ENUM('new','answered') NOT NULL DEFAULT 'new',
  reply      TEXT         NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feedback (
  id         VARCHAR(16)  PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  rating     TINYINT      NOT NULL,
  message    TEXT         NOT NULL,
  approved   TINYINT(1)   NOT NULL DEFAULT 0,     -- shown on the website only when approved
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_registrations (
  id         VARCHAR(16)  PRIMARY KEY,
  event_id   VARCHAR(16)  NOT NULL,
  name       VARCHAR(120) NOT NULL,
  phone      VARCHAR(30)  NOT NULL,
  email      VARCHAR(120) NULL,
  guests     TINYINT      NOT NULL DEFAULT 0,
  notes      VARCHAR(300) NULL,
  status     ENUM('registered','attended','cancelled') NOT NULL DEFAULT 'registered',
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT chk_reg_guests CHECK (guests BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS voucher_claims (
  id             VARCHAR(16)   PRIMARY KEY,
  voucher_id     VARCHAR(16)   NOT NULL,
  code           VARCHAR(16)   NOT NULL UNIQUE,   -- e.g. SHH-56EFEB85
  name           VARCHAR(120)  NOT NULL,
  phone          VARCHAR(30)   NOT NULL,
  phone_digits   VARCHAR(20)   NOT NULL,          -- digits only, so one phone claims a voucher once
  edd            DATE          NULL,              -- expected due date
  status         ENUM('issued','redeemed') NOT NULL DEFAULT 'issued',
  -- snapshot of the voucher at claim time, so later edits never change an issued voucher
  voucher_title  VARCHAR(200)  NOT NULL,
  discount_label VARCHAR(80)   NULL,
  currency       CHAR(3)       NOT NULL DEFAULT 'KES',
  price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  opens_at       DATE          NULL,
  expires        DATE          NULL,
  terms          TEXT          NULL,
  created_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_claim_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_claim_once (voucher_id, phone_digits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ---------- live chat ---------- */
CREATE TABLE IF NOT EXISTS chats (
  id         VARCHAR(16)  PRIMARY KEY,
  token      CHAR(32)     NOT NULL UNIQUE,        -- the visitor's secret; never shown to staff
  name       VARCHAR(60)  NOT NULL DEFAULT 'Visitor',
  status     ENUM('open','closed') NOT NULL DEFAULT 'open',
  unread     INT          NOT NULL DEFAULT 0,     -- visitor messages staff have not seen
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_chats_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chat_id    VARCHAR(16)  NOT NULL,
  sender     ENUM('visitor','staff') NOT NULL,
  staff_name VARCHAR(120) NULL,
  body       VARCHAR(1000) NOT NULL,
  sent_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_msg_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  KEY idx_msg_chat (chat_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
