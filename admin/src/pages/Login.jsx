import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Shield, Mail, Lock, AlertCircle, Loader } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Redirect automatically if session exists
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#070b14] px-4 py-12 overflow-hidden font-sans">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-[#1e2b47]/60 shadow-2xl relative z-10">
        
        {/* Brand details */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 mb-4 animate-pulse-slow">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit tracking-wide">Welcome to CityFix</h2>
          <p className="text-xs text-indigo-400 mt-1 font-semibold tracking-wider uppercase">Administrative Portal</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Error notifications Banner */}
          {(error || authError) && (
            <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 text-rose-300 animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-xs font-medium leading-normal">{error || authError}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2 tracking-wide uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cityfix.gov"
                className="w-full rounded-2xl bg-[#0d1324] border border-[#1e2b47] py-3.5 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-2 tracking-wide uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl bg-[#0d1324] border border-[#1e2b47] py-3.5 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin text-white" />
                Authenticating...
              </>
            ) : (
              'Access Admin Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-[#1e2b47]/50 pt-5 text-center text-xs text-gray-500">
          CityFix Admin Panel is restricted to authorized personnel only.
        </div>
      </div>
    </div>
  );
};

export default Login;
