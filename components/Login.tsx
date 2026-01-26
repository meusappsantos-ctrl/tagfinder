import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle, IdCard, Sun, Moon } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      const firebaseError = err as AuthError;
      let errorMessage = 'Ocorreu um erro. Tente novamente.';
      if (firebaseError.code === 'auth/invalid-email') errorMessage = 'Email inválido.';
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') errorMessage = 'Credenciais inválidas.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 shadow-xl z-50 hover:scale-105 active:scale-95 transition-all"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 transition-colors">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-10 text-center relative overflow-hidden flex flex-col items-center">
          <IdCard className="w-14 h-14 text-white relative z-10 mb-3" />
          <h2 className="text-3xl font-black text-white relative z-10 uppercase tracking-tighter">TagFinder</h2>
          <p className="text-blue-100 relative z-10 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">
            {isLogin ? 'Painel de Acesso' : 'Registro de Operador'}
          </p>
        </div>

        <div className="p-10">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1" htmlFor="email">Email Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none placeholder-slate-400 font-bold"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1" htmlFor="password">Chave de Segurança</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none font-bold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl shadow-xl hover:shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isLogin ? 'Autenticar no Sistema' : 'Criar Novo Acesso'} <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isLogin ? 'Solicitar Novo Cadastro Operacional' : 'Já possuo credenciais de acesso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;