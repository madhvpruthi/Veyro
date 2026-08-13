import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import Navbar from '../components/Navbar';
import Button from '../components/Button';
import MeetingCard, { MeetingData } from '../components/MeetingCard';
import InvitationList from '../components/InvitationList';

import { useAuth } from '../context/AuthContext';

import styles from '../styles/Home.module.css';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const Dashboard: React.FC = () => {
  const router = useRouter();

  const {
    userProfile,
    backendUserId,
  } = useAuth();

  const [upcoming, setUpcoming] = useState<MeetingData[]>([]);
  const [recent, setRecent] = useState<MeetingData[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [creatingInstant, setCreatingInstant] =
    useState(false);

  // --------------------------------------------------
  // Load meetings
  // --------------------------------------------------
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const upRes = await fetch(
        `${API_BASE}/api/meetings/upcoming`
      );

      if (upRes.ok) {
        const upData = await upRes.json();
        setUpcoming(upData);
      }
    } catch (error) {
      console.error(
        'Upcoming meetings fetch error:',
        error
      );
    }

    try {
      const recentRes = await fetch(
        `${API_BASE}/api/meetings/recent`
      );

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecent(recentData);
      }
    } catch (error) {
      console.error(
        'Recent meetings fetch error:',
        error
      );
    }
  };

  // --------------------------------------------------
  // Create instant meeting
  // --------------------------------------------------
  const handleStartInstant = async () => {
    if (!backendUserId) {
      alert(
        'Your account is still being synchronized. Please try again.'
      );
      return;
    }

    setCreatingInstant(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/meetings/instant?host_id=${backendUserId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          errorText || 'Unable to create meeting'
        );
      }

      const data = await res.json();

      console.log(
        'VEYRO: Meeting created:',
        data
      );

      // V2 backend uses room_code for the public meeting URL.
      router.push(
        `/meeting/${data.room_code}`
      );
    } catch (error) {
      console.error(
        'Instant meeting creation failed:',
        error
      );

      alert(
        'Unable to create the meeting. Please try again.'
      );
    } finally {
      setCreatingInstant(false);
    }
  };

  // --------------------------------------------------
  // Join meeting using code/link
  // --------------------------------------------------
  const handleJoinSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!joinCode.trim()) {
      return;
    }

    let cleanCode = joinCode.trim();

    if (cleanCode.includes('/meeting/')) {
      cleanCode =
        cleanCode.split('/meeting/')[1];
    }

    // Remove query/hash if user pasted a full URL.
    cleanCode = cleanCode
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');

    if (!cleanCode) {
      return;
    }

    router.push(
      `/meeting/${cleanCode}`
    );
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>

        {/* --------------------------------------------------
            Hero Section
        -------------------------------------------------- */}
        <section className={styles.hero}>

          <div className={styles.heroBadge}>
            <svg
              width="14"
              height="14"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>

            <span>
              Ultra-HD Video &amp; Audio Engine
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            Seamless Video Meetings for{' '}
            <span
              className={styles.gradientText}
            >
              Every Team
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            Connect, collaborate, and share ideas
            instantly with crystal clear video,
            screen sharing, and scheduled calls.
          </p>

          <div className={styles.quickActions}>

            {/* New Instant Meeting */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartInstant}
              disabled={
                creatingInstant ||
                !backendUserId
              }
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>

              {creatingInstant
                ? 'Starting Room...'
                : 'New Instant Meeting'}
            </Button>

            {/* Join Meeting */}
            <form
              onSubmit={handleJoinSubmit}
              className={styles.joinInputGroup}
            >
              <input
                type="text"
                placeholder="Enter meeting code..."
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value)
                }
                className={styles.joinInput}
              />

              <Button
                type="submit"
                variant="secondary"
                size="md"
              >
                Join
              </Button>
            </form>

            {/* Schedule Meeting */}
            <Button
              href="/schedule"
              variant="outline"
              size="lg"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                />
                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                />
                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                />
              </svg>

              Schedule Call
            </Button>

          </div>
        </section>

        {/* --------------------------------------------------
            Feature / Stats Bar
        -------------------------------------------------- */}
        <div className={styles.statsRow}>

          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <div>
              <div className={styles.statNumber}>
                1080p HD
              </div>

              <div className={styles.statLabel}>
                Crisp Video Quality
              </div>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <div>
              <div className={styles.statNumber}>
                End-to-End
              </div>

              <div className={styles.statLabel}>
                Encrypted Communication
              </div>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>

            <div>
              <div className={styles.statNumber}>
                Zero Latency
              </div>

              <div className={styles.statLabel}>
                Instant Connection
              </div>
            </div>
          </div>

        </div>

        {/* --------------------------------------------------
            Invitations
        -------------------------------------------------- */}
        {userProfile &&
          !userProfile.isGuest && (
            <InvitationList
              currentUser={userProfile}
            />
          )}

        {/* --------------------------------------------------
            Upcoming Meetings
        -------------------------------------------------- */}
        <section className={styles.section}>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="var(--primary-accent)"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <polyline points="12 6 12 12 16 14" />
              </svg>

              Upcoming Meetings ({upcoming.length})
            </h2>
          </div>

          {upcoming.length > 0 ? (
            <div className={styles.grid}>
              {upcoming.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  type="upcoming"
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <svg
                className={styles.emptyIcon}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                />
                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                />
                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                />
              </svg>

              <h3>
                No Upcoming Meetings Scheduled
              </h3>

              <p
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.92rem',
                }}
              >
                Plan ahead by scheduling a
                meeting for your team or clients.
              </p>

              <div
                style={{
                  marginTop: '1.4rem',
                }}
              >
                <Button
                  href="/schedule"
                  variant="secondary"
                  size="sm"
                >
                  Schedule Now
                </Button>
              </div>
            </div>
          )}

        </section>

        {/* --------------------------------------------------
            Recent Meetings
        -------------------------------------------------- */}
        <section className={styles.section}>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>

              Recent Sessions
            </h2>
          </div>

          {recent.length > 0 ? (
            <div className={styles.grid}>
              {recent.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  type="recent"
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>
                No recent meeting history found.
              </p>
            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default Dashboard;