app.post('/api/lobbies', authenticateToken, (req, res) => {
  const { name, type, platform, format, region } = req.body;
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
      INSERT INTO lobbies (id, name, type, platform, format, region, max_players, host_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParticipant = db.prepare(`
      INSERT INTO lobby_participants (lobby_id, user_id)
      VALUES (?, ?)
    `);

    const createTransaction = db.transaction(() => {
      insertLobby.run(lobbyId, name.trim(), type, platform, format || 'Padrão', region || '🇧🇷 Brasil', maxPlayers, userId);
      insertParticipant.run(lobbyId, userId);
    });

    createTransaction();

    io.emit('lobby_created', { lobbyId, platform });

    res.status(201).json({ lobbyId });
  } catch (err) {
    console.error('Erro ao criar lobby:', err);
    res.status(500).json({ error: 'Erro ao criar lobby.' });
  }
});