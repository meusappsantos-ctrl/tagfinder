import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle, IdCard } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Falha na autenticação. Verifique credenciais.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 shadow-[20px_20px_0px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 transition-all">
        <div className="bg-slate-800 p-10 text-center border-b border-slate-700">
          <div className="inline-flex p-5 bg-blue-600 text-white mb-6 shadow-xl"><IdCard size={40} /></div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-2">TagFinder</h2>
          <p className="text-blue-400 text-[10px] font-black tracking-[0.3em] opacity-80 italic">Sistema de Inventário Industrial</p>
        </div>

        <div className="p-10">
          <form onSubmit={handleAuth} className="space-y-8">
            {error && (
              <div className="bg-red-600/10 border-l-4 border-red-600 p-4 flex items-center gap-4">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-[10px] font-black text-red-500 tracking-widest">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">ID Operacional (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-12 pr-4 py-5 bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-600 font-bold transition-all text-sm placeholder-slate-700" placeholder="usuario@empresa.com" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1">Chave de Acesso (Senha)</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-12 pr-12 py-5 bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-600 font-bold transition-all text-sm placeholder-slate-700" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-white transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-[0.2em] py-6 shadow-2xl transition-all active:translate-y-1 flex items-center justify-center gap-3">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{isLogin ? 'Iniciar Sessão' : 'Cadastrar Acesso'} <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-[10px] font-black tracking-widest text-slate-500 hover:text-blue-400 transition-all">
              {isLogin ? 'Solicitar Novo Cadastro' : 'Já possui credenciais? Entrar'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 text-slate-800 text-[10px] font-black tracking-[0.5em] pointer-events-none">Secure Industrial Gateway &bull; v2.5</div>
    </div>
  );
};

export default Login;