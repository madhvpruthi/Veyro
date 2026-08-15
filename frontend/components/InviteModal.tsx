import React, {
  useEffect,
  useState,
} from 'react';

import {
  UserProfile,
  searchUsersByUsername,
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

import Button from './Button';
import styles from '../styles/Forms.module.css';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000';

interface SearchUser {
  id?: number;
  uid: string;
  name: string;
  username: string;
  email: string;
  isGuest: boolean;
}

interface InviteModalProps {
  currentUser: UserProfile;
  meetingId: string;
  meetingTitle?: string;
  onClose: () => void;
}

const InviteModal: React.FC<
  InviteModalProps
> = ({
  currentUser,
  meetingId,
  meetingTitle,
  onClose,
}) => {
  const {
    backendUserId,
  } = useAuth();

  const [
    usernameInput,
    setUsernameInput,
  ] = useState('');

  const [
    results,
    setResults,
  ] = useState<SearchUser[]>([]);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    sendingId,
    setSendingId,
  ] = useState<number | null>(
    null
  );

  const [
    invitedIds,
    setInvitedIds,
  ] = useState<
    Set<number>
  >(new Set());

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');

  const [
    starting,
    setStarting,
  ] = useState(false);

  // --------------------------------------------------
  // Search users
  // --------------------------------------------------

 // --------------------------------------------------
// Search users from Firebase
// --------------------------------------------------

useEffect(() => {
  const queryText = usernameInput
    .trim()
    .replace(/^@/, '')
    .toLowerCase();

  if (queryText.length < 2) {
    setResults([]);
    setSearching(false);
    return;
  }

  const timer = window.setTimeout(
    async () => {
      setSearching(true);
      setError('');

      try {
        const firebaseUsers =
          await searchUsersByUsername(queryText);

        const filteredUsers =
          firebaseUsers.filter(
            (user) =>
              user.uid !== currentUser.uid &&
              !user.isGuest
          );

        setResults(
          filteredUsers.map((user) => ({
            uid: user.uid,
            name: user.name,
            username: user.username,
            email: user.email,
            isGuest: user.isGuest,
          }))
        );
      } catch (error) {
        console.error(
          'Firebase user search failed:',
          error
        );

        setResults([]);

        setError(
          'Unable to search users.'
        );
      } finally {
        setSearching(false);
      }
    },
    300
  );

  return () => {
    window.clearTimeout(timer);
  };
}, [
  usernameInput,
  currentUser.uid,
]);

  // --------------------------------------------------
  // Send one invitation
  // --------------------------------------------------

  const handleSendInvite = async (
  receiver: SearchUser
) => {
  if (!backendUserId) {
    setError(
      'Your account is still being synchronized.'
    );

    return;
  }

  setSendingId(
    receiver.id ?? -1
  );

  setError('');
  setSuccess('');

  try {
    // --------------------------------------------------
    // 1. Make sure the Firebase user exists in SQLite
    // --------------------------------------------------

    let receiverBackendId = receiver.id;

    if (!receiverBackendId) {
      const syncResponse = await fetch(
        `${API_BASE}/api/auth/sync`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            firebase_uid: receiver.uid,
            name: receiver.name,
            username: receiver.username,
            email: receiver.email,
            is_guest: false,
          }),
        }
      );

      const syncResult =
        await syncResponse
          .json()
          .catch(() => null);

      if (!syncResponse.ok) {
        throw new Error(
          syncResult?.detail ||
          'Unable to synchronize the selected user.'
        );
      }

      receiverBackendId =
        Number(syncResult.id);
    }

    if (!receiverBackendId) {
      throw new Error(
        'Could not determine the selected user ID.'
      );
    }

    // --------------------------------------------------
    // 2. Get actual meeting from SQLite
    // --------------------------------------------------

    const meetingResponse =
      await fetch(
        `${API_BASE}/api/meetings/${encodeURIComponent(
          meetingId
        )}`
      );

    if (!meetingResponse.ok) {
      throw new Error(
        'Meeting could not be found.'
      );
    }

    const meeting =
      await meetingResponse.json();

    // --------------------------------------------------
    // 3. Create invitation
    // --------------------------------------------------

    const invitationResponse =
      await fetch(
        `${API_BASE}/api/invitations`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            meeting_id:
              Number(meeting.id),

            sender_id:
              Number(backendUserId),

            receiver_id:
              Number(receiverBackendId),
          }),
        }
      );

    const result =
      await invitationResponse
        .json()
        .catch(() => null);

    if (!invitationResponse.ok) {
      throw new Error(
        result?.detail ||
        'Failed to send invitation.'
      );
    }

    // --------------------------------------------------
    // 4. Mark invitation as sent
    // --------------------------------------------------

    setInvitedIds(
      (previous) => {
        const next =
          new Set(previous);

        next.add(
          Number(receiverBackendId)
        );

        return next;
      }
    );

    setSuccess(
      `Invitation sent to @${receiver.username}`
    );

  } catch (error: any) {
    console.error(
      'Invitation failed:',
      error
    );

    setError(
      error?.message ||
      'Failed to send invitation.'
    );

  } finally {
    setSendingId(null);
  }
};

  // --------------------------------------------------
  // Start meeting
  // --------------------------------------------------

  const handleStartMeeting =
    () => {
      if (!meetingId) {
        return;
      }

      setStarting(true);

      window.location.href =
        `/meeting/${meetingId}`;
    };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background:
          'rgba(5, 8, 17, 0.85)',
        backdropFilter:
          'blur(12px)',
        display: 'flex',
        alignItems:
          'center',
        justifyContent:
          'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight:
            'calc(100vh - 2rem)',
          overflowY: 'auto',
          background:
            'var(--bg-card)',
          border:
            '1px solid var(--border-color)',
          borderRadius:
            'var(--radius-lg)',
          padding:
            '2rem',
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.7)',
          position:
            'relative',
        }}
      >
        {/* Header */}

        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-start',
            marginBottom:
              '1.5rem',
          }}
        >
          <div>
            <h2
              style={{
                color: '#fff',
                fontSize:
                  '1.35rem',
                fontWeight:
                  800,
              }}
            >
              Invite to Meeting
            </h2>

            <p
              style={{
                color:
                  'var(--text-muted)',
                fontSize:
                  '0.88rem',
                marginTop:
                  '0.4rem',
              }}
            >
              {meetingTitle ||
                'Veyro Instant Meeting'}
            </p>

            <p
              style={{
                color:
                  '#93c5fd',
                fontSize:
                  '0.82rem',
                marginTop:
                  '0.2rem',
                fontFamily:
                  'monospace',
              }}
            >
              Room: {meetingId}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width:
                '34px',
              height:
                '34px',
              borderRadius:
                '50%',
              border:
                '1px solid var(--border-color)',
              background:
                'rgba(255,255,255,0.05)',
              color:
                'var(--text-muted)',
              cursor:
                'pointer',
              fontSize:
                '1.2rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}

        <label
          className={
            styles.label
          }
        >
          Search by @username
        </label>

        <div
          style={{
            position:
              'relative',
            marginTop:
              '0.5rem',
          }}
        >
          <span
            style={{
              position:
                'absolute',
              left:
                '0.9rem',
              top:
                '50%',
              transform:
                'translateY(-50%)',
              color:
                '#93c5fd',
              fontWeight:
                700,
            }}
          >
            @
          </span>

          <input
            type="text"
            value={
              usernameInput
            }
            onChange={(event) => {
              setUsernameInput(
                event.target.value
                  .replace(
                    /^\s+/,
                    ''
                  )
              );

              setError('');
              setSuccess('');
            }}
            placeholder="username"
            autoFocus
            className={
              styles.input
            }
            style={{
              paddingLeft:
                '2rem',
            }}
          />
        </div>

        {/* Search status */}

        {searching && (
          <div
            style={{
              padding:
                '0.9rem 0',
              color:
                'var(--text-muted)',
              fontSize:
                '0.86rem',
            }}
          >
            Searching...
          </div>
        )}

        {/* Results */}

        {!searching &&
          usernameInput
            .trim()
            .replace(
              /^@/,
              ''
            ).length >=
            2 &&
          results.length ===
            0 && (
            <div
              style={{
                padding:
                  '1rem 0',
                color:
                  'var(--text-muted)',
                fontSize:
                  '0.86rem',
              }}
            >
              No users found.
            </div>
          )}

        <div
          style={{
            display:
              'flex',
            flexDirection:
              'column',
            gap:
              '0.7rem',
            marginTop:
              '0.8rem',
          }}
        >
          {results.map(
            (user) => {
              const alreadyInvited =
  user.id !== undefined &&
  invitedIds.has(user.id);

              const isSending =
                sendingId ===
                user.id;

              return (
                <div
                  key={
                    user.id
                  }
                  style={{
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'space-between',
                    gap:
                      '1rem',
                    padding:
                      '0.9rem',
                    border:
                      '1px solid var(--border-color)',
                    borderRadius:
                      '12px',
                    background:
                      'rgba(255,255,255,0.03)',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap:
                        '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width:
                          '40px',
                        height:
                          '40px',
                        borderRadius:
                          '50%',
                        background:
                          'var(--primary-gradient)',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        fontWeight:
                          800,
                        color:
                          '#fff',
                      }}
                    >
                      {user.name
                        ?.charAt(
                          0
                        )
                        .toUpperCase() ||
                        '?'}
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            '#fff',
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          user.name
                        }
                      </div>

                      <div
                        style={{
                          color:
                            '#93c5fd',
                          fontSize:
                            '0.84rem',
                        }}
                      >
                        @
                        {
                          user.username
                        }
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() =>
                      handleSendInvite(
                        user
                      )
                    }
                    variant={
                      alreadyInvited
                        ? 'secondary'
                        : 'primary'
                    }
                    size="sm"
                    disabled={
                      alreadyInvited ||
                      isSending
                    }
                  >
                    {alreadyInvited
                      ? 'Sent'
                      : isSending
                      ? 'Sending...'
                      : 'Send Invite'}
                  </Button>
                </div>
              );
            }
          )}
        </div>

        {/* Messages */}

        {success && (
          <div
            style={{
              marginTop:
                '1rem',
              padding:
                '0.8rem 1rem',
              borderRadius:
                '10px',
              background:
                'rgba(34,197,94,0.1)',
              border:
                '1px solid rgba(34,197,94,0.25)',
              color:
                '#86efac',
              fontSize:
                '0.86rem',
            }}
          >
            ✓ {success}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop:
                '1rem',
              padding:
                '0.8rem 1rem',
              borderRadius:
                '10px',
              background:
                'rgba(239,68,68,0.1)',
              border:
                '1px solid rgba(239,68,68,0.25)',
              color:
                '#fca5a5',
              fontSize:
                '0.86rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}

        <div
          style={{
            display:
              'flex',
            gap:
              '0.7rem',
            marginTop:
              '1.5rem',
            paddingTop:
              '1.2rem',
            borderTop:
              '1px solid var(--border-color)',
          }}
        >
          <Button
            onClick={
              handleStartMeeting
            }
            variant="primary"
            size="md"
            disabled={
              starting
            }
          >
            {starting
              ? 'Starting...'
              : 'Start Meeting'}
          </Button>

          <Button
            onClick={
              onClose
            }
            variant="secondary"
            size="md"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;