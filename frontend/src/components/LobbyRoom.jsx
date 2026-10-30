import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Copy, Check, Send, Crown, Users, KeyRound, AlertCircle, Trash2, Volume2, VolumeX } from 'lucide-react';

export default function LobbyRoom({ lobbyId, user, onBack, onRequestAuth }) {
  const [lobby, setLobby] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matchCode, setMatchCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const socketRef = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;

  const chatScrollRef = useRef(null);
  const isHost = user && lobby && user.id === lobby.host_id;
  const isTournament = lobby && lobby.type === 'tournament';

  const isDev = typeof window !== 'undefined' && window.location.port === '5173';
  const API_BASE = isDev ? 'http://localhost:4000' : '';

  // Efeito sonoro nativo esportivo (Alerta de Código Disponível)
  const playSoundAlert = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Acorde triunfal em 3 notas rápidas (D5 -> A5 -> D6)
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880.00, now + 0.1);
      osc.frequency.setValueAtTime(1174.66, now + 0.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.log('Audio notice:', e);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. Carrega os dados da sala
  useEffect(() => {
    fetch(`${API_BASE}/api/lobbies/${lobbyId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Lobby não encontrado');
        }
        return res.json();
      })
      .then((data) => {
        setLobby(data);
        setParticipants(data.participants || []);
        setMessages(data.messages || []);
        if (data.match_code) setMatchCode(data.match_code);
      })
      .catch((err) => {
        console.error('Erro ao abrir lobby:', err);
        alert('Aviso: ' + err.message);
        onBack();
      });
  }, [lobbyId, API_BASE]);

  // 2. Conexão Socket em Tempo Real
  useEffect(() => {
    const socket = io(API_BASE || undefined);
    socketRef.current = socket;

    socket.emit('join_lobby_room', { lobbyId, user: userRef.current });

    socket.on('participants_updated', (updatedList) => {
      setParticipants(updatedList);
    });

    // Quando o Host atualiza o código -> Toca o som de notificação!
    socket.on('match_code_updated', (newCode) => {
      setMatchCode(newCode);
      playSoundAlert();
    });

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('lobby_closed', (msg) => {
      alert(msg || 'Lobby encerrado.');
      onBack();
    });

    socket.on('error_message', (err) => {
      alert(err);
    });

    return () => {
      if (userRef.current) {
        socket.emit('leave_lobby', { lobbyId, userId: userRef.current.id });
      }
      socket.disconnect();
    };
  }, [lobbyId, API_BASE]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopyCode = () => {
    if (!matchCode) return;
    navigator.clipboard.writeText(matchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCodeChange = (e) => {
    const rawValue = e.target.value;
    const sanitized = rawValue.replace(/[^0-9-]/g, '');
    setInputCode(sanitized);
    if (codeError) setCodeError('');
  };

  const handleSendCode = (e) => {
    e.preventDefault();
    if (!inputCode.trim() || !socketRef.current || !isHost) return;

    if (inputCode.trim().length < 4) {
      setCodeError('O código precisa ter pelo menos 4 dígitos.');
      return;
    }

    socketRef.current.emit('update_match_code', { lobbyId, userId: user.id, code: inputCode.trim() });
    playSoundAlert(); // Toca também para o Host ter a confirmação sonora
    setInputCode('');
  };

  const handleCloseLobby = () => {
    if (confirm('Deseja realmente encerrar este lobby para todos?')) {
      if (socketRef.current) {
        socketRef.current.emit('close_lobby', { lobbyId, userId: user.id });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!user) {
      onRequestAuth();
      return;
    }
    if (!inputMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', { lobbyId, user, message: inputMessage });
    setInputMessage('');
  };

  if (!lobby) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  const codeLabel = isTournament ? 'ID do Torneio' : 'Nº da Sala';
  const placeholderExample = isTournament ? 'Ex: 0002-2765-4200' : 'Ex: 3518-7828';

  return (
    <div className="w-full space-y-6 pt-2 pb-16">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-xs font-bold"
        >
          <ArrowLeft size={16} /> SAIR DO LOBBY
        </button>

        <div className="flex items-center gap-2">
          {/* Botão de Mutar/Desmutar Som */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playSoundAlert();
            }}
            title={soundEnabled ? "Som Ativado (Clique para mutar)" : "Som Desativado"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              soundEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som: Ativado' : 'Mutado'}</span>
          </button>

          {isHost && (
            <button 
              onClick={handleCloseLobby}
              className="flex items-center gap-2 text-rose-400 hover:text-white hover:bg-rose-600 transition px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 cursor-pointer text-xs font-bold"
            >
              <Trash2 size={16} /> ENCERRAR LOBBY
            </button>
          )}
        </div>
      </div>

      {/* CABEÇALHO DO LOBBY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-md uppercase border border-emerald-500/20">
              {lobby.type}
            </span>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-md uppercase border border-blue-500/20">
              {lobby.platform}
            </span>
            <span className="text-slate-400 text-xs font-medium">Formato: {lobby.format}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">{lobby.name}</h1>
          <p className="text-xs text-slate-500 mt-1">Host da Sala: <strong className="text-slate-300">{lobby.host_name}</strong></p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <Users size={18} className="text-emerald-400" />
          <span className="text-lg font-bold text-white">{participants.length}</span>
          <span className="text-slate-500 text-sm">/ {lobby.max_players} jogadores</span>
        </div>
      </div>

      {/* CÓDIGO DA PARTIDA + CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD DO CÓDIGO COM NOTIFICAÇÃO VISUAL */}
          <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-xl relative">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <KeyRound size={16} /> {codeLabel} no eFootball
            </div>

            {matchCode ? (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
                <div>
                  <div className="text-2xl sm:text-4xl font-mono font-black text-white tracking-widest text-emerald-400">
                    {matchCode}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Copie e cole este código em <strong>{codeLabel}</strong> no eFootball.
                  </p>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer text-sm"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'COPIADO!' : 'COPIAR CÓDIGO'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center my-2">
                <AlertCircle size={28} className="mx-auto text-amber-400 mb-2" />
                <p className="text-sm font-semibold text-slate-200">Aguardando o Host gerar a sala no jogo...</p>
                <p className="text-xs text-slate-500 mt-1">
                  O Host está criando a partida no eFootball e colocará o <strong>{codeLabel}</strong> aqui.
                </p>
              </div>
            )}

            {/* PAINEL EXCLUSIVO DO HOST */}
            {isHost && (
              <form onSubmit={handleSendCode} className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
                    <Crown size={14} /> Painel do Host
                  </div>
                  <span className="text-[11px] text-slate-500">Cole o código numérico gerado no eFootball</span>
                </div>

                {codeError && (
                  <p className="text-xs text-rose-400 mb-2">{codeError}</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={handleCodeChange}
                    maxLength={18}
                    placeholder={placeholderExample}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400 text-sm tracking-widest"
                  />
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer"
                  >
                    ENVIAR CÓDIGO
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* JOGADORES PRESENTES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={16} /> Jogadores Presentes ({participants.length}/{lobby.max_players})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {participants.map((p) => {
                const participantIsHost = p.id === lobby.host_id;
                return (
                  <div 
                    key={p.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                      <span className="font-semibold text-slate-200 text-sm">{p.username}</span>
                    </div>
                    {participantIsHost && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-md">
                        <Crown size={12} /> HOST
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHAT EM TEMPO REAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[480px]">
          <div className="pb-3 border-b border-slate-800 font-bold text-sm text-slate-300 flex items-center justify-between">
            <span>Chat da Sala</span>
            <span className="text-xs text-slate-500 font-normal">Ao vivo</span>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-600 my-auto">Nenhuma mensagem ainda.</p>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">{m.username}</span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-200 break-words">{m.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={user ? "Digite uma mensagem..." : "Faça login para falar..."}
              disabled={!user}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || !inputMessage.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}