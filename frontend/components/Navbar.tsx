import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';

import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

import styles from '../styles/Navbar.module.css';
import compStyles from '../styles/Components.module.css';

import InviteModal from './InviteModal';
import NotificationListener from './NotificationListener';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000';

const Navbar: React.FC = () => {
  const router = useRouter();

  const {
    backendUserId,
    userProfile,
    firebaseUser,
  } = useAuth();

  const [timeStr, setTimeStr] =
    useState('');

  const [showInviteModal, setShowInviteModal] =
    useState(false);

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  const [inviteMeetingId, setInviteMeetingId] =
    useState('');

  const [creatingInviteMeeting, setCreatingInviteMeeting] =
    useState(false);

  // --------------------------------------------------
  // Clock
  // --------------------------------------------------

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) +
          ' • ' +
          now.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
      );
    };

    updateTime();

    const interval = window.setInterval(
      updateTime,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // --------------------------------------------------
  // Canonical current user
  //
  // userProfile comes from AuthContext.
  // Do not use localStorage here for the displayed
  // name/email/username because it can be stale.
  // --------------------------------------------------

  const displayName =
    userProfile?.name ||
    firebaseUser?.displayName ||
    'User';

  const displayEmail =
    userProfile?.email ||
    firebaseUser?.email ||
    '';

  const displayUsername =
    userProfile?.username ||
    'user';

  const displayUid =
    userProfile?.uid ||
    firebaseUser?.uid ||
    '';

  const isGuest =
    userProfile?.isGuest ??
    firebaseUser?.isAnonymous ??
    false;

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        'Logout failed:',
        error
      );
    }

    localStorage.removeItem(
      'veyro_user'
    );

    sessionStorage.removeItem(
      'veyro_display_name'
    );

    setShowProfileMenu(false);

    router.push('/login');
  };

  // --------------------------------------------------
  // Create meeting + open Invite modal
  // --------------------------------------------------

  const openInviteModal = async () => {
    if (!backendUserId) {
      alert(
        'Your account is still being synchronized. Please try again.'
      );

      return;
    }

    setCreatingInviteMeeting(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/meetings/instant?host_id=${backendUserId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            'Unable to create meeting.'
        );
      }

      const meeting =
        await response.json();

      if (!meeting?.room_code) {
        throw new Error(
          'Backend did not return a room code.'
        );
      }

      setInviteMeetingId(
        meeting.room_code
      );

      setShowInviteModal(true);
    } catch (error) {
      console.error(
        'Invite meeting creation failed:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Unable to create the meeting. Please try again.'
      );
    } finally {
      setCreatingInviteMeeting(false);
    }
  };

  // --------------------------------------------------
  // Close profile menu when route changes
  // --------------------------------------------------

  useEffect(() => {
    setShowProfileMenu(false);
  }, [router.pathname]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>

          {/* Logo */}

          <Link
            href="/"
            className={styles.logo}
          >
            <div
              className={styles.logoBadge}
            >
              <svg viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>

            <span>Veyro</span>
          </Link>

          {/* Navigation */}

          <ul className={styles.navLinks}>
            <li>
              <Link
                href="/"
                className={`${styles.navLink} ${
                  router.pathname === '/'
                    ? styles.navLinkActive
                    : ''
                }`}
              >
                Dashboard
              </Link>
            </li>

            <li>
              <Link
                href="/schedule"
                className={`${styles.navLink} ${
                  router.pathname ===
                  '/schedule'
                    ? styles.navLinkActive
                    : ''
                }`}
              >
                Schedule
              </Link>
            </li>

            <li>
              <Link
                href="/join"
                className={`${styles.navLink} ${
                  router.pathname ===
                  '/join'
                    ? styles.navLinkActive
                    : ''
                }`}
              >
                Join Room
              </Link>
            </li>
          </ul>

          {/* Right side */}

          <div
            className={
              styles.rightSection
            }
          >
            {/* Time */}

            <div
              className={
                styles.timeDisplay
              }
            >
              <span
                className={styles.dot}
              />

              <span>
                {timeStr || 'Live'}
              </span>
            </div>

            {/* Authenticated user */}

            {userProfile || firebaseUser ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                }}
              >

                {/* ----------------------------------
                    PROFILE TAB
                   ---------------------------------- */}

                <div
                  className={
                    styles.profileWrap
                  }
                >
                  <button
                    onClick={() =>
                      setShowProfileMenu(
                        (value) => !value
                      )
                    }
                    aria-label="Open profile menu"
                    aria-expanded={
                      showProfileMenu
                    }
                    className={
                      styles.profileTrigger
                    }
                  >
                    <div
                      className={
                        styles.profileAvatar
                      }
                    >
                      {displayName
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span
                      className={
                        styles.profileUsername
                      }
                    >
                      @{displayUsername}
                    </span>

                    <span
                      className={`${styles.profileChevron} ${
                        showProfileMenu
                          ? styles.profileChevronOpen
                          : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {/* --------------------------------
                      PROFILE DROPDOWN
                     -------------------------------- */}

                  {showProfileMenu && (
                    <div
                      className={
                        styles.profileMenu
                      }
                    >
                      {/* User details */}

                      <div
                        className={
                          styles.profileMenuHeader
                        }
                      >
                        <div
                          className={
                            styles.profileMenuAvatar
                          }
                        >
                          {displayName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {displayName}
                          </strong>

                          <span>
                            @{displayUsername}
                          </span>
                        </div>
                      </div>

                      <div
                        className={
                          styles.profileDetails
                        }
                      >
                        <div>
                          <span>
                            Full Name
                          </span>

                          <strong>
                            {displayName}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Username
                          </span>

                          <strong>
                            @{displayUsername}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Email
                          </span>

                          <strong>
                            {displayEmail ||
                              'No email available'}
                          </strong>
                        </div>
                      </div>

                      {/* Invitations */}

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(
                            false
                          );

                          document
                            .getElementById(
                              'invitations'
                            )
                            ?.scrollIntoView({
                              behavior:
                                'smooth',
                              block:
                                'start',
                            });
                        }}
                        className={
                          styles.profileMenuAction
                        }
                      >
                        ✉ Invitations
                      </button>

                      {/* Logout */}

                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        className={`${styles.profileMenuAction} ${styles.profileMenuActionDanger}`}
                      >
                        ↪ Log Out
                      </button>
                    </div>
                  )}
                </div>

                {/* ----------------------------------
                    INVITE BUTTON
                   ---------------------------------- */}

                {!isGuest && (
                  <button
                    onClick={
                      openInviteModal
                    }
                    disabled={
                      creatingInviteMeeting
                    }
                    className={`${compStyles.btn} ${compStyles.btnOutline} ${compStyles.btnSm}`}
                    title="Create a meeting and invite someone"
                  >
                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2-2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>

                    {creatingInviteMeeting
                      ? 'Creating...'
                      : 'Invite'}
                  </button>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`${compStyles.btn} ${compStyles.btnPrimary} ${compStyles.btnSm}`}
              >
                Log In / Sign Up
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Invite Modal */}

      {showInviteModal &&
        (userProfile ||
          firebaseUser) && (
          <InviteModal
            currentUser={
              userProfile as any
            }
            meetingId={
              inviteMeetingId
            }
            meetingTitle="Veyro Instant Meeting"
            onClose={() =>
              setShowInviteModal(
                false
              )
            }
          />
        )}

      {/* Notifications */}

      {displayUid && (
        <NotificationListener
          currentUid={displayUid}
          currentName={displayName}
        />
      )}
    </>
  );
};

export default Navbar;