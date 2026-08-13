import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface NotificationListenerProps {
  currentUid: string;
  currentName: string;
}

interface MeetingRequest {
  id: string;
  senderName: string;
  senderUsername: string;
  meetingId: string;
  meetingTitle: string;
  status: string;
}

const NotificationListener: React.FC<NotificationListenerProps> = ({ currentUid, currentName }) => {
  const router = useRouter();
  const [pendingInvite, setPendingInvite] = useState<MeetingRequest | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!currentUid || currentUid.startsWith('local_')) return;

    const q = query(
      collection(db, 'meeting_requests'),
      where('targetUid', '==', currentUid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setPendingInvite({
            id: change.doc.id,
            senderName: data.senderName,
            senderUsername: data.senderUsername,
            meetingId: data.meetingId,
            meetingTitle: data.meetingTitle,
            status: data.status,
          });
        }
      });
    }, (err) => {
      // Silently fail if Firestore not configured
      console.log('Notification listener not active:', err.code);
    });

    return () => unsubscribe();
  }, [currentUid]);

  const handleAccept = async () => {
    if (!pendingInvite) return;
    setDismissing(true);
    try {
      await updateDoc(doc(db, 'meeting_requests', pendingInvite.id), { status: 'accepted' });
    } catch (e) {}
    router.push(`/meeting/${pendingInvite.meetingId}`);
    setPendingInvite(null);
  };

  const handleDecline = async () => {
    if (!pendingInvite) return;
    setDismissing(true);
    try {
      await updateDoc(doc(db, 'meeting_requests', pendingInvite.id), { status: 'declined' });
    } catch (e) {}
    setPendingInvite(null);
    setDismissing(false);
  };

  if (!pendingInvite) return null;

  return (
    <div style={{
      position: 'fixed', top: '5.5rem', right: '1.5rem', zIndex: 500,
      background: 'rgba(14, 21, 37, 0.97)',
      border: '1px solid rgba(45, 140, 255, 0.5)',
      borderRadius: '20px', padding: '1.4rem',
      width: '340px', maxWidth: 'calc(100vw - 3rem)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(45, 140, 255, 0.2)',
      animation: 'fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'var(--primary-gradient)', borderRadius: '20px 20px 0 0' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', marginBottom: '1rem' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'var(--primary-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#fff',
          flexShrink: 0,
        }}>
          {pendingInvite.senderName[0].toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.98rem', lineHeight: 1.3 }}>
            {pendingInvite.senderName}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>invited you to join</span>
          </p>
          <p style={{ fontSize: '0.88rem', color: '#93c5fd', marginTop: '0.2rem' }}>
            @{pendingInvite.senderUsername} · <span style={{ color: 'var(--text-muted)' }}>{pendingInvite.meetingTitle}</span>
          </p>
        </div>
      </div>

      {/* Room Code */}
      <div style={{
        background: 'rgba(0,0,0,0.35)', border: '1px dashed rgba(45, 140, 255, 0.3)',
        borderRadius: '10px', padding: '0.5rem 0.9rem',
        fontSize: '0.88rem', color: '#bfdbfe', fontFamily: 'monospace',
        marginBottom: '1.1rem',
      }}>
        Room: {pendingInvite.meetingId}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.7rem' }}>
        <button
          onClick={handleAccept}
          disabled={dismissing}
          style={{
            flex: 1, padding: '0.65rem 0',
            background: 'var(--primary-gradient)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px', color: '#fff',
            fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(45, 140, 255,0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          Accept & Join
        </button>
        <button
          onClick={handleDecline}
          disabled={dismissing}
          style={{
            padding: '0.65rem 1rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px', color: 'var(--text-muted)',
            fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default NotificationListener;
