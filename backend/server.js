// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'lobbykick_super_secret_key_2026';

app.use(cors({ origin: '*' }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: '*' }
});

const pendingDeletions = new Map();

function purgeEmptyLobbies() {
  try {
    db.exec(`
      DELETE FROM lobbies 
      WHERE id NOT IN (SELECT DISTINCT lobby_id FROM lobby_participants)
    `);
  } catch (e) {
    console.error('Erro na faxina:', e);
  }
}

purgeEmptyLobbies();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão expirada ou inválida.' });
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// -------------------------------------------------------------

// 1. Cadastro
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Nome de usuário deve ter entre 3 e 20 caracteres.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(username.trim(), email.toLowerCase().trim(), passwordHash);

    const user = { id: info.lastInsertRowid, username: username.trim(), email: email.toLowerCase().trim() };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ user, token });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'E-mail ou nome de usuário já cadastrado.' });
    }
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const userData = { id: user.id, username: user.username, email: user.email };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ user: userData, token });
  } catch (err) {
    return res.status(500).json({ error: 'Erro no servidor ao tentar login.' });
  }
});

// 3. Recuperação de Acesso / Redefinir Senha Oficial
app.post('/api/auth/reset-password', (req, res) => {
  const { email, username, newPassword } = req.body;

  if (!email || !username || !newPassword) {
    return res.status(400).json({ error: 'Preencha todos os campos para redefinir sua senha.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND username = ?').get(
      email.toLowerCase().trim(),
      username.trim()
    );

    if (!user) {
      return res.status(404).json({ error: 'Dados não conferem. Verifique o e-mail e o nick informados.' });
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, user.id);

    return res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao redefinir senha no servidor.' });
  }
});

// -------------------------------------------------------------
// ROTAS DE LOBBIES
// -------------------------------------------------------------

app.get('/api/lobbies', (req, res) => {
  purgeEmptyLobbies();

  const { platform } = req.query;

  let query = `
    SELECT 
      l.*,
      u.username as host_name,
      (SELECT COUNT(*) FROM lobby_participants lp WHERE lp.lobby_id = l.id) as current_players,
      mc.code as match_code
    FROM lobbies l
    JOIN users u ON l.host_id = u.id
    LEFT JOIN match_codes mc ON l.id = mc.lobby_id
    WHERE l.status != 'closed'
  `;

  const params = [];
  if (platform && platform !== 'all') {
    query += ` AND l.platform = ?`;
    params.push(platform);
  }

  query += ` ORDER BY l.created_at DESC`;

  try {
    const lobbies = db.prepare(query).all(...params);
    res.json(lobbies);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar lobbies.' });
  }
});

app.get('/api/lobbies/:id', (req, res) => {
  const { id } = req.params;

  try {
    const lobby = db.prepare(`
      SELECT 
        l.*,
        u.username as host_name,
        mc.code as match_code
      FROM lobbies l
      JOIN users u ON l.host_id = u.id
      LEFT JOIN match_codes mc ON l.id = mc.lobby_id
      WHERE l.id = ?
    `).get(id);

    if (!lobby) return res.status(404).json({ error: 'Lobby não encontrado.' });

    const participants = db.prepare(`
      SELECT u.id, u.username, lp.joined_at
      FROM lobby_participants lp
      JOIN users u ON lp.user_id = u.id
      WHERE lp.lobby_id = ?
      ORDER BY lp.joined_at ASC
    `).all(id);

    const messages = db.prepare(`
      SELECT id, user_id, username, message, created_at
      FROM messages
      WHERE lobby_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(id);

    res.json({ ...lobby, participants, messages });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar sala.' });
  }
});

app.post('/api/lobbies', authenticateToken, (req, res) => {
  const { name, type, platform, format } = req.body;
  const userId = req.user.id;

  if (!name || !type || !platform) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  let maxPlayers = 2;
  if (type === 'coop') maxPlayers = 6;
  if (type === 'tournament') maxPlayers = 8;

  const lobbyId = crypto.randomBytes(4).toString('hex');

  try {
    const insertLobby = db.prepare(`
      INSERT INTO lobbies (id, name, type, platform, format, max_players, host_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParticipant = db.prepare(`
      INSERT INTO lobby_participants (lobby_id, user_id)
      VALUES (?, ?)
    `);

    const createTransaction = db.transaction(() => {
      insertLobby.run(lobbyId, name.trim(), type, platform, format || 'Padrão', maxPlayers, userId);
      insertParticipant.run(lobbyId, userId);
    });

    createTransaction();

    io.emit('lobby_created', { lobbyId, platform });

    res.status(201).json({ lobbyId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar lobby.' });
  }
});

function handleUserExit(lobbyId, userId) {
  try {
    db.prepare('DELETE FROM lobby_participants WHERE lobby_id = ? AND user_id = ?').run(lobbyId, userId);
    
    const check = db.prepare('SELECT COUNT(*) as count FROM lobby_participants WHERE lobby_id = ?').get(lobbyId);

    if (!check || check.count === 0) {
      if (pendingDeletions.has(lobbyId)) {
        clearTimeout(pendingDeletions.get(lobbyId));
      }

      const timeout = setTimeout(() => {
        try {
          const currentCheck = db.prepare('SELECT COUNT(*) as count FROM lobby_participants WHERE lobby_id = ?').get(lobbyId);
          if (!currentCheck || currentCheck.count === 0) {
            db.prepare('DELETE FROM lobbies WHERE id = ?').run(lobbyId);
            io.to(lobbyId).emit('lobby_closed', 'O lobby foi encerrado por inatividade.');
            io.emit('lobbies_updated');
          }
        } catch (err) {
          console.error(err);
        } finally {
          pendingDeletions.delete(lobbyId);
        }
      }, 8000);

      pendingDeletions.set(lobbyId, timeout);
    } else {
      const participants = db.prepare(`
        SELECT u.id, u.username, lp.joined_at
        FROM lobby_participants lp
        JOIN users u ON lp.user_id = u.id
        WHERE lp.lobby_id = ?
        ORDER BY lp.joined_at ASC
      `).all(lobbyId);

      io.to(lobbyId).emit('participants_updated', participants);
    }

    io.emit('lobbies_updated');
  } catch (e) {
    console.error(e);
  }
}

// -------------------------------------------------------------
// SOCKET.IO
// -------------------------------------------------------------
io.on('connection', (socket) => {
  socket.on('join_lobby_room', ({ lobbyId, user }) => {
    socket.join(lobbyId);

    if (pendingDeletions.has(lobbyId)) {
      clearTimeout(pendingDeletions.get(lobbyId));
      pendingDeletions.delete(lobbyId);
    }

    if (user && user.id) {
      socket.userId = user.id;
      socket.lobbyId = lobbyId;

      try {
        const lobby = db.prepare('SELECT max_players FROM lobbies WHERE id = ?').get(lobbyId);
        const count = db.prepare('SELECT COUNT(*) as total FROM lobby_participants WHERE lobby_id = ?').get(lobbyId);
        const existing = db.prepare('SELECT * FROM lobby_participants WHERE lobby_id = ? AND user_id = ?').get(lobbyId, user.id);

        if (!existing) {
          if (lobby && count.total >= lobby.max_players) {
            socket.emit('error_message', 'Este lobby já está cheio.');
            return;
          }
          db.prepare('INSERT INTO lobby_participants (lobby_id, user_id) VALUES (?, ?)').run(lobbyId, user.id);
        }

        const participants = db.prepare(`
          SELECT u.id, u.username, lp.joined_at
          FROM lobby_participants lp
          JOIN users u ON lp.user_id = u.id
          WHERE lp.lobby_id = ?
          ORDER BY lp.joined_at ASC
        `).all(lobbyId);

        io.to(lobbyId).emit('participants_updated', participants);
        io.emit('lobbies_updated');
      } catch (e) {
        console.error(e);
      }
    }
  });

  socket.on('update_match_code', ({ lobbyId, userId, code }) => {
    try {
      const lobby = db.prepare('SELECT host_id FROM lobbies WHERE id = ?').get(lobbyId);
      if (!lobby || lobby.host_id !== userId) {
        socket.emit('error_message', 'Apenas o Host pode alterar o código.');
        return;
      }

      const sanitizedCode = String(code).trim().replace(/[^0-9-]/g, '');

      if (!sanitizedCode || sanitizedCode.length < 4) {
        socket.emit('error_message', 'Código inválido. Insira apenas números e traço.');
        return;
      }

      db.prepare(`
        INSERT INTO match_codes (lobby_id, code, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(lobby_id) DO UPDATE SET code = excluded.code, updated_at = CURRENT_TIMESTAMP
      `).run(lobbyId, sanitizedCode);

      io.to(lobbyId).emit('match_code_updated', sanitizedCode);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('close_lobby', ({ lobbyId, userId }) => {
    try {
      const lobby = db.prepare('SELECT host_id FROM lobbies WHERE id = ?').get(lobbyId);
      if (lobby && lobby.host_id === userId) {
        if (pendingDeletions.has(lobbyId)) {
          clearTimeout(pendingDeletions.get(lobbyId));
          pendingDeletions.delete(lobbyId);
        }
        db.prepare('DELETE FROM lobbies WHERE id = ?').run(lobbyId);
        io.to(lobbyId).emit('lobby_closed', 'O Host encerrou este lobby.');
        io.emit('lobbies_updated');
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('send_message', ({ lobbyId, user, message }) => {
    if (!message || !message.trim()) return;

    try {
      const stmt = db.prepare(`
        INSERT INTO messages (lobby_id, user_id, username, message)
        VALUES (?, ?, ?, ?)
      `);
      const info = stmt.run(lobbyId, user.id, user.username, message.trim());

      const newMessage = {
        id: info.lastInsertRowid,
        user_id: user.id,
        username: user.username,
        message: message.trim(),
        created_at: new Date().toISOString()
      };

      io.to(lobbyId).emit('new_message', newMessage);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('leave_lobby', ({ lobbyId, userId }) => {
    handleUserExit(lobbyId, userId);
  });

  socket.on('disconnect', () => {
    if (socket.lobbyId && socket.userId) {
      handleUserExit(socket.lobbyId, socket.userId);
    }
  });
});

// -------------------------------------------------------------
// SERVIR O FRONTEND
// -------------------------------------------------------------
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('⚽ Servidor LobbyKick rodando com sucesso!');
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`⚽ Servidor LobbyKick rodando com sucesso na porta ${PORT}`);
});