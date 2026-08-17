import React, { useState } from 'react';
import { X, Trophy, Users, Swords } from 'lucide-react';

export default function CreateLobbyModal({ isOpen, onClose, user, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('1v1');
  const [platform, setPlatform] = useState('Console & PC');
  const [format, setFormat] = useState('Autenticado / Livre');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('lobbykick_token');

    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, type, platform, format })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar lobby.');

      onCreated(data.lobbyId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-1">Criar Sala de Matchmaking</h2>
        <p className="text-sm text-slate-400 mb-6">Configure seu lobby e receba jogadores para sua partida.</p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nome do Lobby
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treino 1v1 Division 1 / Co-op 3v3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Partida
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '1v1', label: '1v1', desc: '2 Jogadores', icon: Swords },
                { id: 'coop', label: 'Co-op', desc: 'Até 6 Jogadores', icon: Users },
                { id: 'tournament', label: 'Torneio', desc: '8 Jogadores', icon: Trophy },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon size={20} className={isSelected ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className="font-bold text-sm mt-1">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="Console & PC">Console & PC (Crossplay)</option>
                <option value="Mobile">Mobile (iOS & Android)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Formato / Regra
              </label>
              <input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Ex: 3v3 / Sem épicos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'CRIANDO SALA...' : 'CRIAR LOBBY & ENTRAR COMO HOST'}
          </button>
        </form>
      </div>
    </div>
  );
}