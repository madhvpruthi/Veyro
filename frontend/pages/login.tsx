import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from 'firebase/auth';
import { auth, db, saveUserProfileToFirestore, isUsernameAvailable } from '../lib/firebase';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import styles from '../styles/Forms.module.css';

type AuthMode = 'login' | 'signup' | 'guest';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateUsername = (u: string) => /^[a-z0-9_]{3,20}$/.test(u.toLowerCase().trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'signup') {
        const cleanUsername = username.toLowerCase().trim().replace('@', '');

        if (!validateUsername(cleanUsername)) {
          setErrorMsg('Username must be 3–20 characters: letters, numbers, underscores only.');
          setLoading(false);
          return;
        }

        const available = await isUsernameAvailable(cleanUsername).catch(() => true);
        if (!available) {
          setErrorMsg(`@${cleanUsername} is already taken. Please choose another.`);
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });

        await saveUserProfileToFirestore({
          uid: cred.user.uid,
          username: cleanUsername,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          isGuest: false,
        }).catch(() => {});

        // Store locally as well
        localStorage.setItem('veyro_user', JSON.stringify({
          uid: cred.user.uid,
          username: cleanUsername,
          name: name.trim(),
          email: email.trim(),
          isGuest: false,
        }));
        sessionStorage.setItem('veyro_display_name', name.trim());
        router.push('/');

      } else if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const displayName = cred.user.displayName || email.split('@')[0];
        localStorage.setItem('veyro_user', JSON.stringify({
          uid: cred.user.uid,
          name: displayName,
          email: email.trim(),
          isGuest: false,
        }));
        sessionStorage.setItem('veyro_display_name', displayName);
        router.push('/');

      } else if (mode === 'guest') {
        const finalName = guestName.trim() || 'Guest User';
        const cleanUsername = 'guest_' + Math.random().toString(36).substring(2, 7);

        const cred = await signInAnonymously(auth);
        await updateProfile(cred.user, { displayName: finalName });

        await saveUserProfileToFirestore({
          uid: cred.user.uid,
          username: cleanUsername,
          name: finalName,
          email: `${cleanUsername}@guest.veyro.local`,
          isGuest: true,
        }).catch(() => {});

        localStorage.setItem('veyro_user', JSON.stringify({
          uid: cred.user.uid,
          username: cleanUsername,
          name: finalName,
          email: '',
          isGuest: true,
        }));
        sessionStorage.setItem('veyro_display_name', finalName);
        router.push('/');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setErrorMsg('This email is already registered.');
      else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') setErrorMsg('Invalid email or password.');
      else if (code === 'auth/weak-password') setErrorMsg('Password must be at least 6 characters.');
      else if (code === 'auth/invalid-api-key' || code === 'auth/api-not-enabled') {
        // Firebase not configured — fall back to local session
        const fallbackUser = {
          uid: 'local_' + Date.now(),
          username: mode === 'signup' ? username.toLowerCase().trim() : email.split('@')[0],
          name: name || guestName || 'User',
          email: email,
          isGuest: mode === 'guest',
        };
        localStorage.setItem('veyro_user', JSON.stringify(fallbackUser));
        sessionStorage.setItem('veyro_display_name', fallbackUser.name);
        router.push('/');
        return;
      } else setErrorMsg(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.65rem',
    borderRadius: '10px',
    border: 'none',
    background: active ? 'var(--primary-gradient)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    fontWeight: active ? 700 : 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: active ? '0 4px 15px rgba(45, 140, 255, 0.35)' : 'none',
  } as React.CSSProperties);

  return (
    <div>
      <Navbar />
      <div className={styles.formContainer} style={{ maxWidth: '500px' }}>

        {/* Logo */}
        <div className={styles.formHeader}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px',
            background: 'var(--primary-gradient)', margin: '0 auto 1.2rem auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(45, 140, 255, 0.5)',
          }}>
            <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className={styles.formTitle}>
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Continue as Guest'}
          </h1>
          <p className={styles.formSubtitle}>
            {mode === 'login' ? 'Log in to your Veyro account' :
             mode === 'signup' ? 'Sign up and get your @username to invite others' :
             'Join instantly without registration'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: 'rgba(9, 13, 22, 0.7)', padding: '0.3rem',
          borderRadius: '14px', marginBottom: '2rem',
          border: '1px solid var(--border-color)',
        }}>
          <button type="button" onClick={() => { setMode('login'); setErrorMsg(''); }} style={tabStyle(mode === 'login')}>Log In</button>
          <button type="button" onClick={() => { setMode('signup'); setErrorMsg(''); }} style={tabStyle(mode === 'signup')}>Sign Up</button>
          <button type="button" onClick={() => { setMode('guest'); setErrorMsg(''); }} style={tabStyle(mode === 'guest')}>Guest</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div className={styles.alertError}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errorMsg}
            </div>
          )}

          {/* Signup: Name */}
          {mode === 'signup' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input type="text" placeholder="Alex Johnson" value={name}
                onChange={(e) => setName(e.target.value)} className={styles.input} required />
            </div>
          )}

          {/* Signup: Username */}
          {mode === 'signup' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Choose a Username
                <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '0.82rem' }}> (used for invites: @username)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: '#93c5fd', fontWeight: 700, fontSize: '1rem', pointerEvents: 'none',
                }}>@</span>
                <input type="text" placeholder="alexj" value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className={styles.input} style={{ paddingLeft: '2.1rem' }} required maxLength={20} />
              </div>
              {username.length > 0 && (
                <p style={{ fontSize: '0.82rem', color: validateUsername(username) ? '#34d399' : '#f87171', marginTop: '0.3rem' }}>
                  {validateUsername(username) ? `✓ @${username} looks good` : '3–20 chars: letters, numbers, underscores only'}
                </p>
              )}
            </div>
          )}

          {/* Guest: Display name */}
          {mode === 'guest' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Your Display Name</label>
              <input type="text" placeholder="e.g. Alex (Guest)" value={guestName}
                onChange={(e) => setGuestName(e.target.value)} className={styles.input} />
            </div>
          )}

          {/* Email */}
          {mode !== 'guest' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input type="email" placeholder="alex@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className={styles.input} required />
            </div>
          )}

          {/* Password */}
          {mode !== 'guest' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} className={styles.input}
                required minLength={6} />
            </div>
          )}

          <div style={{ marginTop: '1.8rem' }}>
            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Processing...' :
               mode === 'login' ? 'Log In to Veyro' :
               mode === 'signup' ? 'Create My Account' :
               'Continue as Guest ✨'}
            </Button>
          </div>
        </form>

        {/* Footer Links */}
        <div style={{ textAlign: 'center', marginTop: '1.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <p>Don't have an account?{' '}
              <span onClick={() => setMode('signup')} style={{ color: '#93c5fd', cursor: 'pointer', fontWeight: 700 }}>Sign Up</span>
              {' '}or{' '}
              <span onClick={() => setMode('guest')} style={{ color: '#93c5fd', cursor: 'pointer', fontWeight: 700 }}>Continue as Guest</span>
            </p>
          )}
          {mode === 'signup' && (
            <p>Already have an account?{' '}
              <span onClick={() => setMode('login')} style={{ color: '#93c5fd', cursor: 'pointer', fontWeight: 700 }}>Log In</span>
            </p>
          )}
          {mode === 'guest' && (
            <p>Want meeting history & invites?{' '}
              <span onClick={() => setMode('signup')} style={{ color: '#93c5fd', cursor: 'pointer', fontWeight: 700 }}>Create Account</span>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
