import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import styles from '../styles/Forms.module.css';

const JoinPage: React.FC = () => {
  const router = useRouter();
  const [meetingCode, setMeetingCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;

    setLoading(true);
    let cleanCode = meetingCode.trim();
    if (cleanCode.includes('/meeting/')) {
      cleanCode = cleanCode.split('/meeting/')[1];
    }
    
    // Store optional display name in sessionStorage so meeting page can use it for Jitsi user info
    if (displayName.trim()) {
      sessionStorage.setItem('veyro_display_name', displayName.trim());
    }

    router.push(`/meeting/${cleanCode}`);
  };

  return (
    <div>
      <Navbar />
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>Join a Meeting</h1>
          <p className={styles.formSubtitle}>Enter a meeting link or code to connect instantly</p>
        </div>

        <form onSubmit={handleJoin}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Meeting Code or Link</label>
            <input
              type="text"
              placeholder="e.g. vey-abc-xyz or full meeting URL"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Your Display Name</label>
            <input
              type="text"
              placeholder="e.g. Alex Johnson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Joining Room...' : 'Join Meeting Now'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinPage;
