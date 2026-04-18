import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { Starfield } from './Starfield';
import { Logo } from './Logo';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, loading, error, setError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await login(username, password);
        onLogin();
      } else {
        await register(username, password, confirmPassword);
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setUsername(username);
        setError(null);
        // Show success - user can now log in
        alert('Account created. Please sign in.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden font-sans bg-brand-bg">
      <div className="absolute inset-0 z-0">
        <Starfield />
        {/* Ambient glow orbs */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-pink-500/20 blur-[120px] rounded-full pointer-events-none" />
      </div>

      <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center justify-between z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex flex-col max-w-xl text-brand-text mb-12 lg:mb-0"
        >
          <div className="flex items-center gap-3 mb-6">
            <Logo size={48} animated={true} />
            <span className="text-2xl font-bold tracking-tight">Secure Chat</span>
          </div>
          <h1 className="text-7xl font-bold mb-6 leading-tight">
            SECURE<br />
            <span className="gradient-text">ENCRYPTED</span><br />
            MESSAGING
          </h1>
          <p className="text-xl text-brand-text-muted max-w-md leading-relaxed">
            End-to-end encrypted. Only you and the recipient can read messages. Add friends and chat securely.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass rounded-[32px] p-10 shadow-2xl shadow-black/20">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Icons.Lock size={20} className="text-brand-accent" />
                <h2 className="text-2xl font-bold text-brand-text">{isLogin ? 'Sign In' : 'Create Account'}</h2>
              </div>
              <p className="text-sm text-brand-text-muted">{isLogin ? 'Enter your credentials to continue' : 'Join the secure network today'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-brand-input border border-brand-border rounded-xl py-3.5 px-4 text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent transition-all"
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-input border border-brand-border rounded-xl py-3.5 px-4 text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent transition-all"
                    placeholder="Enter your password"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text"
                  >
                    {showPassword ? '👁' : '👁‍🗨'}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-input border border-brand-border rounded-xl py-3.5 px-4 text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent transition-all"
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                  />
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="w-full bg-colorful-gradient text-white font-bold py-4 rounded-xl shadow-2xl shadow-black/20 transition-all disabled:opacity-70"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
              </motion.button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-border"></div></div>
                <span className="relative px-4 bg-transparent text-xs text-brand-text-muted uppercase font-mono">or</span>
              </div>
              <p className="text-sm text-brand-text-muted">
                {isLogin ? 'Not registered yet? ' : 'Already have an account? '}
                <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-brand-accent font-bold hover:underline">
                  {isLogin ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
