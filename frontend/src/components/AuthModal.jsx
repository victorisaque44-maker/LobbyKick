import React, { useState } from 'react';
import { X, Lock, Mail, User, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setNewPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const getUrl = (endpoint) => window.location.port === '5173' ? `http://localhost:4000${endpoint}` : endpoint;

    try {
      if (mode === 'login') {
        const res = await fetch(getUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer login.');

        localStorage.setItem('lobbykick_token', data.token);
        localStorage.setItem('lobbykick_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
        onClose();
      } else if (mode === 'register') {
        const res = await fetch(getUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');

        localStorage.setItem('lobbykick_token', data.token);
        localStorage.setItem('lobbykick_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
        onClose();
      } else if (mode === 'forgot') {
        const res = await fetch(getUrl('/api/auth/reset-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha.');

        setSuccessMsg('Senha alterada com sucesso! Redirecionando...');
        setTimeout(() => {
          setMode('login');
          resetFormState();
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* TÍTULO */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            {mode === 'login' && 'Entrar no LobbyKick'}
            {mode === 'register' && 'Criar Conta Gratuita'}
            {mode === 'forgot' && 'Recuperar Acesso'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'login' && 'Encontre partidas e conecte-se aos lobbies'}
            {mode === 'register' && 'Junte-se à comunidade do eFootball'}
            {mode === 'forgot' && 'Informe seu nick e e-mail para criar uma nova senha'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-xl mb-4 flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NICK (Apenas no Cadastro e na Recuperação) */}
          {(mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nome de Jogador (Nick)
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: ProPlayer99"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* E-MAIL (Em todos os modos) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* SENHA (Login e Cadastro) */}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); resetFormState(); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-medium"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* NOVA SENHA (Apenas na Recuperação) */}
          {mode === 'forgot' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nova Senha
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'Processando...' : (
              mode === 'login' ? 'ENTRAR' :
              mode === 'register' ? 'CRIAR CONTA' : 'REDEFINIR SENHA'
            )}
          </button>
        </form>

        {/* RODAPÉ DO MODAL */}
        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' && (
            <p>
              Não tem uma conta?
              <button
                type="button"
                onClick={() => { setMode('register'); resetFormState(); }}
                className="ml-2 text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Cadastre-se
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              Já possui uma conta?
              <button
                type="button"
                onClick={() => { setMode('login'); resetFormState(); }}
                className="ml-2 text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Fazer Login
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => { setMode('login'); resetFormState(); }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer font-semibold"
            >
              <ArrowLeft size={14} /> Voltar para o Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}