import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Meeting.module.css';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const JITSI_DOMAIN = 'meet.madhav.cloud';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: any
    ) => any;
  }
}

const MeetingRoom: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const {
    firebaseUser,
    userProfile,
    backendUserId,
    loading: authLoading,
  } = useAuth();

  const meetingRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any>(null);

  const [meetingDetails, setMeetingDetails] =
    useState<any>(null);

  const [toastMsg, setToastMsg] =
    useState<string | null>(null);

  const [jitsiReady, setJitsiReady] =
    useState(false);

  const displayName =
    userProfile?.name ||
    firebaseUser?.displayName ||
    sessionStorageSafe('veyro_display_name') ||
    'Veyro User';

  const email =
    userProfile?.email ||
    firebaseUser?.email ||
    undefined;

  // --------------------------------------------------
  // 1. Load meeting details
  // --------------------------------------------------
  useEffect(() => {
    if (!id || typeof id !== 'string') {
      return;
    }

    const loadMeeting = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/meetings/${id}`
        );

        if (!res.ok) {
          console.error(
            'Failed to load meeting:',
            res.status
          );

          setMeetingDetails(null);
          return;
        }

        const data = await res.json();

        setMeetingDetails(data);
      } catch (error) {
        console.error(
          'Failed to load meeting:',
          error
        );

        setMeetingDetails(null);
      }
    };

    loadMeeting();
  }, [id]);

  // --------------------------------------------------
  // 2. Register the current user as a participant
  // --------------------------------------------------
  useEffect(() => {
    if (
      !id ||
      typeof id !== 'string' ||
      !backendUserId
    ) {
      return;
    }

    const registerParticipant = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/meetings/${id}/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: backendUserId,
              role: 'participant',
            }),
          }
        );

        if (!res.ok) {
          const text = await res.text();

          console.error(
            'Participant registration failed:',
            res.status,
            text
          );

          return;
        }

        const participant =
          await res.json();

        console.log(
          'VEYRO: Participant registered:',
          participant
        );
      } catch (error) {
        console.error(
          'Participant registration failed:',
          error
        );
      }
    };

    registerParticipant();
  }, [id, backendUserId]);

  // --------------------------------------------------
  // 3. Load and initialize Jitsi
  // --------------------------------------------------
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!id || typeof id !== 'string') {
      return;
    }

    // User must be authenticated in Veyro.
    if (!firebaseUser && !userProfile) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    const createMeeting = async () => {
      try {
        // ----------------------------------------------
        // Load Jitsi External API
        // ----------------------------------------------
        if (!window.JitsiMeetExternalAPI) {
          await new Promise<void>(
            (resolve, reject) => {
              const existingScript =
                document.querySelector(
                  'script[data-veyro-jitsi-api="true"]'
                ) as HTMLScriptElement | null;

              if (existingScript) {
                existingScript.addEventListener(
                  'load',
                  () => resolve(),
                  { once: true }
                );

                existingScript.addEventListener(
                  'error',
                  () =>
                    reject(
                      new Error(
                        'Jitsi API failed to load'
                      )
                    ),
                  { once: true }
                );

                return;
              }

              const script =
                document.createElement(
                  'script'
                );

              script.src =
                `https://${JITSI_DOMAIN}/external_api.js`;

              script.async = true;

              script.dataset.veyroJitsiApi =
                'true';

              script.onload = () =>
                resolve();

              script.onerror = () =>
                reject(
                  new Error(
                    'Unable to load Jitsi External API'
                  )
                );

              document.head.appendChild(
                script
              );
            }
          );
        }

        if (
          cancelled ||
          !meetingRef.current ||
          !window.JitsiMeetExternalAPI
        ) {
          return;
        }

        // ----------------------------------------------
        // Dispose previous Jitsi instance
        // ----------------------------------------------
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.dispose();
          } catch {
            // Ignore cleanup errors.
          }

          jitsiApiRef.current = null;
        }

        // ----------------------------------------------
        // Create Jitsi conference
        // ----------------------------------------------
        const api =
          new window.JitsiMeetExternalAPI(
            JITSI_DOMAIN,
            {
              roomName: id,

              parentNode:
                meetingRef.current,

              width: '100%',
              height: '100%',

              userInfo: {
                displayName,
                ...(email
                  ? { email }
                  : {}),
              },

              configOverwrite: {
                enableWelcomePage: false,

                prejoinConfig: {
                  enabled: false,
                },

                startWithAudioMuted:
                  false,

                startWithVideoMuted:
                  false,

                toolbarButtons: [
                  'microphone',
                  'camera',
                  'hangup',
                  'tileview',
                ],
              },

              interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK:
                  false,

                SHOW_WATERMARK_FOR_GUESTS:
                  false,

                SHOW_BRAND_WATERMARK:
                  false,

                SHOW_POWERED_BY: false,

                MOBILE_APP_PROMO: false,

                DISABLE_JOIN_LEAVE_NOTIFICATIONS:
                  true,
              },

              onload: () => {
                console.log(
                  'VEYRO: Jitsi iframe loaded'
                );

                setJitsiReady(true);
              },
            }
          );

        jitsiApiRef.current = api;

        // ----------------------------------------------
        // Conference joined
        // ----------------------------------------------
        api.addEventListener(
          'videoConferenceJoined',
          (event: any) => {
            console.log(
              'VEYRO: Joined conference:',
              event
            );

            if (!displayName) {
              return;
            }

            try {
              api.executeCommand(
                'displayName',
                displayName
              );
            } catch {
              // Ignore command errors.
            }
          }
        );

        // ----------------------------------------------
        // Conference left
        // ----------------------------------------------
        api.addEventListener(
          'videoConferenceLeft',
          () => {
            console.log(
              'VEYRO: Left conference'
            );

            setJitsiReady(false);
          }
        );

        // ----------------------------------------------
        // Jitsi ready to close
        // ----------------------------------------------
        api.addEventListener(
          'readyToClose',
          () => {
            router.push('/');
          }
        );
      } catch (error) {
        console.error(
          'Unable to start Jitsi:',
          error
        );

        setJitsiReady(false);

        showToast(
          'Unable to load the meeting. Please try again.'
        );
      }
    };

    createMeeting();

    return () => {
      cancelled = true;

      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {
          // Ignore cleanup errors.
        }

        jitsiApiRef.current = null;
      }
    };
  }, [
    authLoading,
    firebaseUser,
    userProfile,
    id,
    displayName,
    email,
    router,
  ]);

  // --------------------------------------------------
  // Share meeting link
  // --------------------------------------------------
  const handleShareLink = () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard
    ) {
      showToast(
        'Clipboard is not available.'
      );

      return;
    }

    navigator.clipboard
      .writeText(
        window.location.href
      )
      .then(() => {
        showToast(
          'Meeting link copied to clipboard!'
        );
      })
      .catch(() => {
        showToast(
          'Unable to copy meeting link.'
        );
      });
  };

  // --------------------------------------------------
  // Toast
  // --------------------------------------------------
  function showToast(message: string) {
    setToastMsg(message);

    window.setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  }

  // --------------------------------------------------
  // Loading screen
  // --------------------------------------------------
  if (!id || authLoading) {
    return (
      <div
        className={
          styles.meetingWrapper
        }
        style={{
          alignItems: 'center',
          justifyContent:
            'center',
          color: '#fff',
        }}
      >
        <p>
          Preparing your Veyro meeting...
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // Meeting UI
  // --------------------------------------------------
  return (
    <div
      className={
        styles.meetingWrapper
      }
    >
      <header
        className={
          styles.meetingHeader
        }
      >
        <div
          className={
            styles.headerLeft
          }
        >
          <Link
            href="/"
            className={
              styles.backBtn
            }
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M19 12H5M12 19l-7-7 7 7" />
            </svg>

            <span>
              Exit
            </span>
          </Link>

          <div
            className={
              styles.brandMini
            }
          >
            <div
              className={
                styles.brandDot
              }
            >
              V
            </div>

            <span>
              Veyro
            </span>
          </div>

          <div
            className={
              styles.meetingTitle
            }
          >
            <span>
              {meetingDetails?.title ||
                'Veyro Instant Meeting'}
            </span>

            <span
              className={
                styles.meetingCodeBadge
              }
            >
              {id}
            </span>
          </div>
        </div>

        <div
          className={
            styles.headerRight
          }
        >
          <div
            className={
              styles.youLabel
            }
          >
            <span
              className={
                styles.onlineDot
              }
            />

            {displayName}
          </div>

          <button
            onClick={
              handleShareLink
            }
            className={
              styles.shareBtn
            }
          >
            Share
          </button>
        </div>
      </header>

      <main
        className={
          styles.iframeContainer
        }
      >
        <div
          ref={meetingRef}
          className={
            styles.meetingSurface
          }
          aria-label="Veyro video meeting"
        />

        {!jitsiReady && (
          <div
            className={
              styles.jitsiLoading
            }
          >
            Connecting to your Veyro meeting...
          </div>
        )}
      </main>

      {toastMsg && (
        <div
          className={
            styles.toast
          }
        >
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------
// Safe sessionStorage helper
// --------------------------------------------------
function sessionStorageSafe(
  key: string
): string | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  try {
    return sessionStorage.getItem(
      key
    );
  } catch {
    return null;
  }
}

export default MeetingRoom;