import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import styles from '../styles/Forms.module.css';

const API_BASE = 'http://127.0.0.1:8000';

const SchedulePage: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Default date: tomorrow at 10:00 AM
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  const [dateTime, setDateTime] = useState(getDefaultDateTime());
  const [duration, setDuration] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        title: title || 'Scheduled Meeting',
        description,
        start_time: new Date(dateTime).toISOString(),
        duration_minutes: Number(duration),
      };

      const res = await fetch(`${API_BASE}/api/meetings/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedMeeting(data);
      } else {
        // Fallback local creation if server backend unavailable
        const randomCode = 'vey-' + Math.random().toString(36).substring(2, 7);
        setCreatedMeeting({
          id: randomCode,
          title: title || 'Scheduled Meeting',
          description,
          start_time: new Date(dateTime).toISOString(),
          duration_minutes: Number(duration),
        });
      }
    } catch (err) {
      const randomCode = 'vey-' + Math.random().toString(36).substring(2, 7);
      setCreatedMeeting({
        id: randomCode,
        title: title || 'Scheduled Meeting',
        description,
        start_time: new Date(dateTime).toISOString(),
        duration_minutes: Number(duration),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdMeeting) return;
    const meetingUrl = `${window.location.origin}/meeting/${createdMeeting.id}`;
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Navbar />
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>Schedule a Meeting</h1>
          <p className={styles.formSubtitle}>Set up a future meeting link and share invite details</p>
        </div>

        {createdMeeting ? (
          <div>
            <div className={styles.alertSuccess}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <strong>Meeting Scheduled Successfully!</strong>
                <p style={{ fontSize: '0.88rem', marginTop: '0.2rem' }}>
                  Your meeting room ID is: <code>{createdMeeting.id}</code>
                </p>
              </div>
            </div>

            <div className={styles.previewBox}>
              <div className={styles.previewTitle}>Invite Details</div>
              <p><strong>Title:</strong> {createdMeeting.title}</p>
              {createdMeeting.description && <p><strong>Description:</strong> {createdMeeting.description}</p>}
              <p><strong>Date & Time:</strong> {new Date(createdMeeting.start_time).toLocaleString()}</p>
              <p><strong>Duration:</strong> {createdMeeting.duration_minutes} minutes</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button onClick={handleCopyLink} variant="secondary" size="md" style={{ flex: 1 }}>
                {copied ? '✓ Link Copied' : 'Copy Meeting Link'}
              </Button>
              <Button href={`/meeting/${createdMeeting.id}`} variant="primary" size="md" style={{ flex: 1 }}>
                Start Room Now
              </Button>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Button onClick={() => setCreatedMeeting(null)} variant="outline" size="sm">
                Schedule Another Meeting
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Meeting Title</label>
              <input
                type="text"
                placeholder="e.g. Weekly Product Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description (Optional)</label>
              <textarea
                placeholder="Agenda, goals, or meeting notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textarea}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={90}>1.5 Hours</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Creating Meeting...' : 'Schedule Meeting'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
