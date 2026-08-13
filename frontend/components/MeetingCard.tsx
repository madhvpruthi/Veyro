import React, { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Components.module.css';

export interface MeetingData {
  id: string;
  title?: string;
  description?: string;
  start_time: string;
  duration_minutes?: number;
  participants?: any[];
}

interface MeetingCardProps {
  meeting: MeetingData;
  type?: 'upcoming' | 'recent' | 'live';
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, type = 'upcoming' }) => {
  const [copied, setCopied] = useState(false);

  const startDate = new Date(meeting.start_time);
  const formattedDate = startDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/meeting/${meeting.id}`;
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeClass = () => {
    if (type === 'live') return `${styles.badge} ${styles.badgeLive}`;
    if (type === 'upcoming') return `${styles.badge} ${styles.badgeUpcoming}`;
    return `${styles.badge} ${styles.badgeRecent}`;
  };

  return (
    <div className={styles.card}>
      <div>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{meeting.title || 'Untitled Meeting'}</h3>
          <span className={getBadgeClass()}>
            {type === 'live' ? '• LIVE NOW' : type === 'upcoming' ? 'UPCOMING' : 'PAST'}
          </span>
        </div>
        
        {meeting.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.4rem 0 0.8rem 0' }}>
            {meeting.description}
          </p>
        )}

        <div className={styles.cardMeta} style={{ marginTop: '0.75rem' }}>
          <div className={styles.cardMetaItem}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formattedDate} at {formattedTime}</span>
          </div>
          {meeting.duration_minutes && (
            <div className={styles.cardMetaItem}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{meeting.duration_minutes}m</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className={styles.codeBox} style={{ marginBottom: '1rem' }}>
          <span>ID: {meeting.id}</span>
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? '#34d399' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className={styles.cardActions}>
          <Link
            href={`/meeting/${meeting.id}`}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            style={{ flex: 1 }}
          >
            Join Room
          </Link>
          <button
            onClick={handleCopyLink}
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            title="Share Link"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
