import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, UserPlus, LogIn, AlertCircle, Sparkles, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, signup, logout, resetPassword, isConfigured } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (isReset) {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        setMsg({ type: 'error', text: error });
      } else {
        setMsg({ type: 'success', text: 'Email di ripristino inviata! Controlla la tua casella di posta.' });
      }
      return;
    }

    if (isSignUp) {
      const { error } = await signup(email, password);
      setLoading(false);
      if (error) {
        setMsg({ type: 'error', text: error });
      } else {
        setMsg({ type: 'success', text: 'Account creato con successo! Se richiesto, verifica la tua email per accedere.' });
      }
    } else {
      const { error } = await login(email, password);
      setLoading(false);
      if (error) {
        setMsg({ type: 'error', text: error });
      } else {
        onClose();
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-nature-100 slide-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-nature-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          /* User Profile / Logout State */
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-nature-100 text-nature-700 flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-soft">
              {user.email?.[0].toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-1">Accesso Effettuato</h3>
            <p className="text-sm text-stone-500 mb-6 font-mono break-all">{user.email}</p>

            <div className="p-4 rounded-2xl bg-nature-50 border border-nature-200/70 text-left text-xs text-nature-800 space-y-1.5 mb-6">
              <div className="flex items-center gap-2 font-semibold text-nature-900">
                <Sparkles className="w-4 h-4 text-nature-600" />
                <span>Sicurezza & Crittografia Attive</span>
              </div>
              <p>Tutti i tuoi cicli e annotazioni giornaliere sono salvati in modo sicuro e visibili solo ed esclusivamente a te (Row Level Security).</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors border border-rose-200/80"
            >
              Disconnetti Account
            </button>
          </div>
        ) : (
          /* Login / Signup / Password Reset Form */
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-nature-500 text-white flex items-center justify-center mx-auto mb-3 shadow-soft">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {isReset ? 'Recupera Password' : isSignUp ? 'Crea il tuo Account' : 'Accedi ai tuoi Dati'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {isReset
                  ? 'Inserisci la tua email per ricevere le istruzioni di ripristino'
                  : isSignUp
                  ? 'Registrati per sincronizzare e proteggere i tuoi dati su Supabase'
                  : 'I tuoi dati sono protetti e accessibili solo con le tue credenziali'}
              </p>
            </div>

            {!isConfigured && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Supabase non ancora collegato</p>
                  <p className="mt-0.5">Inserisci l'URL del progetto e la chiave Anon nella scheda <strong>Impostazioni</strong> per abilitare l'autenticazione.</p>
                </div>
              </div>
            )}

            {msg && (
              <div
                className={`mb-4 p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  msg.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="latuaemail@esempio.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
                  />
                </div>
              </div>

              {!isReset && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setIsReset(true); setMsg(null); }}
                      className="text-[11px] text-nature-600 hover:text-nature-700 font-medium"
                    >
                      Password dimenticata?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-nature-600 to-nature-500 hover:from-nature-700 hover:to-nature-600 text-white font-bold text-sm shadow-soft transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isReset ? (
                  'Invia Link di Ripristino'
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crea Account</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Accedi</span>
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Links */}
            <div className="mt-5 text-center text-xs text-stone-500">
              {isReset ? (
                <button
                  onClick={() => { setIsReset(false); setMsg(null); }}
                  className="font-semibold text-nature-600 hover:underline"
                >
                  Torna al Login
                </button>
              ) : isSignUp ? (
                <p>
                  Hai già un account?{' '}
                  <button
                    onClick={() => { setIsSignUp(false); setMsg(null); }}
                    className="font-bold text-nature-600 hover:underline"
                  >
                    Accedi qui
                  </button>
                </p>
              ) : (
                <p>
                  Non hai ancora un account?{' '}
                  <button
                    onClick={() => { setIsSignUp(true); setMsg(null); }}
                    className="font-bold text-nature-600 hover:underline"
                  >
                    Registrati gratis
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
