'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle, Sparkles, Hash, Layers } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, loginWithEmail, signUpWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const mapAuthError = (err: any): string => {
    if (!err) return 'Authentication failed.';
    const code = err.code || '';
    const message = err.message || '';
    
    if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) {
      return 'This email is already registered. Please log in.';
    }
    if (code === 'auth/invalid-credential' || message.includes('auth/invalid-credential')) {
      return 'Invalid email or password.';
    }
    if (code === 'auth/user-not-found' || message.includes('auth/user-not-found')) {
      return 'No account found. Please sign up.';
    }
    if (code === 'auth/weak-password' || message.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    
    return err.message || 'Authentication failed. Please check your credentials.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();

    if (activeTab === 'signin') {
      if (!emailTrimmed || !passwordTrimmed) {
        setError('Please provide email and password.');
        return;
      }
      setSubmitting(true);
      try {
        await loginWithEmail(emailTrimmed, passwordTrimmed);
        router.push('/dashboard');
      } catch (err: any) {
        console.error(err);
        setError(mapAuthError(err));
        setSubmitting(false);
      }
    } else {
      const nameTrimmed = name.trim();
      const rollTrimmed = rollNumber.trim();
      const sectionTrimmed = section.trim();

      if (!nameTrimmed || !emailTrimmed || !rollTrimmed || !sectionTrimmed || !passwordTrimmed) {
        setError('All fields are required.');
        return;
      }
      setSubmitting(true);
      try {
        await signUpWithEmail(emailTrimmed, passwordTrimmed, nameTrimmed, rollTrimmed, sectionTrimmed);
        router.push('/dashboard');
      } catch (err: any) {
        console.error(err);
        setError(mapAuthError(err));
        setSubmitting(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(mapAuthError(err));
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center animate-pulse">
          <span className="text-indigo-400 font-extrabold text-sm">B</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      {/* Background blur rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-48 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -mr-48 pointer-events-none" />

      {/* Login Container */}
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* App Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3">
            <span className="text-white font-black text-lg tracking-tighter">B</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight leading-none uppercase">
            Batch<span className="text-indigo-400 font-black">OS</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1.5 uppercase">
            MBA Management Portal
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-850 mb-6">
          <button
            onClick={() => { setActiveTab('signin'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-250'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-250'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-400 text-xs font-medium flex items-start gap-2 mb-4 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'signup' && (
            <>
              <div>
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Mayank Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. MBA2026042"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Section</label>
                <div className="relative">
                  <Layers className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="e.g. student@mba.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-805 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-450 font-bold uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-805 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : activeTab === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Try Demo Accounts Section */}
        <div className="mt-5 pt-4 border-t border-slate-800/40">
          <span className="block text-[9px] text-slate-500 font-bold tracking-widest uppercase text-center mb-2.5">
            Try Demo Accounts
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setEmail('admin@batchos.test');
                setPassword('BatchOS@Admin123');
              }}
              className="flex-1 py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 backdrop-blur-md border border-white/5 hover:border-white/15 text-slate-300 hover:text-white text-[10px] font-semibold transition-all duration-300 shadow-inner cursor-pointer text-center"
            >
              Login as Demo Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setEmail('student@batchos.test');
                setPassword('BatchOS@Student123');
              }}
              className="flex-1 py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 backdrop-blur-md border border-white/5 hover:border-white/15 text-slate-300 hover:text-white text-[10px] font-semibold transition-all duration-300 shadow-inner cursor-pointer text-center"
            >
              Login as Demo Student
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-850"></div>
          <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold tracking-widest uppercase">or continue with</span>
          <div className="flex-grow border-t border-slate-850"></div>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-805 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google Authentication
        </button>
      </div>
    </div>
  );
}
