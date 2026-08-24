import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  Gamepad2, Plus, Users, 
  Monitor, Smartphone, LogOut, User as UserIcon 
} from 'lucide-react';

import AuthModal from './components/AuthModal';
import CreateLobbyModal from './components/CreateLobbyModal';
import LobbyRoom from './components/LobbyRoom';

export default function App() {
  const [user, setUser] = useState(null);
  const [platform, setPlatform] = useState('all');
  const [lobbies, setLobbies] = useState([]);
  const [activeLobbyId, setActiveLobbyId] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Carrega usuário salvo localmente
  useEffect(() => {
    const savedUser = localStorage.getItem('lobbykick_user');
    const token = localStorage.getItem('lobbykick_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getApiUrl = (endpoint) => window.location.port === '5173' ? `http://localhost:4000${endpoint}` : endpoint;

  const fetchLobbies = useCallback(() => {
    fetch(getApiUrl(`/api/lobbies?platform=${platform}`))
      .then((res) => res.json())
      .then((data) => setLobbies(data || []))
      .catch(console.error);
  }, [platform]);

  useEffect(() => {
    fetchLobbies();
  }, [fetchLobbies]);

  useEffect(() => {
    if (activeLobbyId) return;

    const socketUrl = window.location.port === '5173' ? 'http://localhost:4000' : undefined;
    const socket = io(socketUrl);
    socket.on('lobbies_updated', fetchLobbies);
    socket.on('lobby_created', fetchLobbies);

    return () => socket.disconnect();
  }, [activeLobbyId, fetchLobbies]);

  const handleLogout = () => {
    localStorage.removeItem('lobbykick_token');
    localStorage.removeItem('lobbykick_user');
    setUser(null);
    setActiveLobbyId(null);
    setCreateModalOpen(false);
  };

  const handleJoinLobby = (lobbyId) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setActiveLobbyId(lobbyId);
  };

  const handleCreateLobbyClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setCreateModalOpen(true);
  };

  const handleBackToLobbies = useCallback(() => {
    setActiveLobbyId(null);
    fetchLobbies();
  }, [fetchLobbies]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* NAVBAR */}
      <header className="w-full bg-[#070a12] border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            onClick={handleBackToLobbies}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-slate-950 text-xl">
              LK
            </div>
            <span className="text-xl font-black tracking-wider text-white">
              LOBBY<span className="text-emerald-400">KICK</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-xl">
                <UserIcon size={16} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">{user.username}</span>
                <button 
                  onClick={handleLogout}
                  title="Sair da Conta"
                  className="text-slate-500 hover:text-rose-400 transition ml-2 cursor-pointer"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                ENTRAR / CADASTRAR
              </button>
            )}

            <button
              onClick={handleCreateLobbyClick}
              className="flex items-center gap-1.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus size={18} /> CRIAR LOBBY
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeLobbyId ? (
          <LobbyRoom 
            lobbyId={activeLobbyId} 
            user={user} 
            onBack={handleBackToLobbies}
            onRequestAuth={() => setAuthModalOpen(true)}
          />
        ) : (
          <div className="space-y-10">
            {/* HERO */}
            <div className="text-center py-10 px-4 bg-gradient-to-b from-slate-900/80 to-transparent border border-slate-800/80 rounded-3xl relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full mb-4">
                ⚽ Matchmaking da Comunidade eFootball
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto">
                Find your match. <span className="text-emerald-400">Play instantly.</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mt-3">
                A maneira mais rápida de encontrar jogadores, pegar o código da sala e entrar em campo.
              </p>
            </div>

            {/* PLATAFORMAS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Filtrar por Plataforma:
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Todas as Plataformas', icon: Gamepad2 },
                  { id: 'Console & PC', label: 'Console & PC (Crossplay)', icon: Monitor },
                  { id: 'Mobile', label: 'Mobile (iOS & Android)', icon: Smartphone },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = platform === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPlatform(item.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LOBBIES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Lobbies Disponíveis 
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {lobbies.length}
                  </span>
                </h2>
              </div>

              {lobbies.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
                  <Gamepad2 size={40} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-bold text-slate-300">Nenhum lobby ativo no momento</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Seja o primeiro a abrir uma sala para jogar!
                  </p>
                  <button
                    onClick={handleCreateLobbyClick}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={16} /> CRIAR PRIMEIRO LOBBY
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lobbies.map((l) => {
                    const isFull = l.current_players >= l.max_players;
                    return (
                      <div
                        key={l.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase border border-emerald-500/20">
                              {l.type}
                            </span>
                            <span className="text-[11px] text-blue-400 font-medium">
                              {l.platform}
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition line-clamp-1">
                            {l.name}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span>Host: <strong className="text-slate-300">{l.host_name}</strong></span>
                            <span>•</span>
                            <span>{l.format}</span>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Users size={14} className={isFull ? "text-rose-400" : "text-emerald-400"} />
                            <span className="font-bold text-white">{l.current_players} / {l.max_players}</span>
                            <span className="text-slate-500 text-[11px]">jogadores</span>
                          </div>

                          <button
                            onClick={() => handleJoinLobby(l.id)}
                            disabled={isFull}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isFull
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10'
                            }`}
                          >
                            {isFull ? 'LOTADO' : 'ENTRAR'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-[#070a12] py-6 text-center text-xs text-slate-500">
        <p>LobbyKick — Plataforma independente da comunidade eFootball. Não filiada à Konami.</p>
      </footer>

      {/* MODAL DE LOGIN (FAZ O LOGIN E FICA NA PÁGINA INICIAL) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => {
          setUser(userData);
          setAuthModalOpen(false); // Fecha e fica na página inicial de boa!
        }}
      />

      {/* MODAL DE CRIAR SALA (SÓ ABRE SE VOCÊ CLICAR NO BOTÃO DE CRIAR LOBBY) */}
      <CreateLobbyModal
        isOpen={createModalOpen}
        user={user}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newLobbyId) => {
          setActiveLobbyId(newLobbyId);
          fetchLobbies();
        }}
      />
    </div>
  );
}