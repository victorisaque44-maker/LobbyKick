// backend/database.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lobbykick.db'));

// Habilita chaves estrangeiras no SQLite
db.pragma('foreign_keys = ON');

// Criação das tabelas essenciais
db.exec(`
  -- Tabela de Usuários
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabela de Lobbies
  CREATE TABLE IF NOT EXISTS lobbies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,          -- '1v1', 'coop', 'tournament'
    platform TEXT NOT NULL,      -- 'PC', 'PlayStation', 'Xbox', 'Mobile'
    format TEXT DEFAULT 'Padrão',
    max_players INTEGER NOT NULL,
    host_id INTEGER NOT NULL,
    status TEXT DEFAULT 'open',  -- 'open', 'in_match', 'closed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users (id)
  );

  -- Tabela de Participantes do Lobby
  CREATE TABLE IF NOT EXISTS lobby_participants (
    lobby_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lobby_id, user_id),
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  -- Tabela de Código da Partida (Match Room Code)
  CREATE TABLE IF NOT EXISTS match_codes (
    lobby_id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE CASCADE
  );

  -- Tabela de Mensagens do Chat
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lobby_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

console.log('✅ Banco de dados SQLite inicializado com sucesso.');

module.exports = db;