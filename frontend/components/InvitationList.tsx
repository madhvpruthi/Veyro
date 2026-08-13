import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { UserProfile } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

import styles from '../styles/Home.module.css';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000';

interface Invitation {
  id: number;

  meeting_id: number;
  room_code: string;
  meeting_title: string;

  sender_id: number;
  sender_name: string;
  sender_username: string;

  receiver_id: number;
  receiver_name: string;
  receiver_username: string;

  status: string;

  created_at: string;
  expires_at: string;
  responded_at?: string | null;
}

interface InvitationListProps {
  currentUser: UserProfile;
}

export default function InvitationList({
  currentUser,
}: InvitationListProps) {
  const {
    backendUserId,
  } = useAuth();

  const [
    invitations,
    setInvitations,
  ] = useState<Invitation[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    actionId,
    setActionId,
  ] = useState<number | null>(
    null
  );

  const [
    tick,
    setTick,
  ] = useState(0);

  // --------------------------------------------------
  // Load invitations
  // --------------------------------------------------

  const loadInvitations =
    async () => {
      if (!backendUserId) {
        return;
      }

      try {
        setError('');

        const response =
          await fetch(
            `${API_BASE}/api/invitations/user/${backendUserId}`
          );

        if (!response.ok) {
          throw new Error(
            'Unable to load invitations.'
          );
        }

        const data =
          await response.json();

        setInvitations(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          'Invitation loading failed:',
          error
        );

        setError(
          'Unable to load invitations.'
        );
      } finally {
        setLoading(false);
      }
    };

  // --------------------------------------------------
  // Initial load + refresh every 30 sec
  // --------------------------------------------------

  useEffect(() => {
    if (
      !currentUser?.uid ||
      currentUser.isGuest ||
      !backendUserId
    ) {
      setLoading(false);
      return;
    }

    loadInvitations();

    const interval =
      window.setInterval(() => {
        loadInvitations();
      }, 30000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    currentUser?.uid,
    currentUser?.isGuest,
    backendUserId,
  ]);

  // --------------------------------------------------
  // Refresh countdown display
  // --------------------------------------------------

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setTick(
          (value) => value + 1
        );
      }, 10000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  // --------------------------------------------------
  // Sort invitations
  // --------------------------------------------------

  const items = useMemo(
    () => {
      return [...invitations].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
    },
    [invitations]
  );

  // --------------------------------------------------
  // Expiry
  // --------------------------------------------------

  const getExpiryLabel =
    (
      invitation: Invitation
    ) => {
      // tick intentionally referenced so
      // React refreshes the countdown.
      void tick;

      if (
        invitation.status !==
        'pending'
      ) {
        return invitation.status;
      }

      const expires =
        new Date(
          invitation.expires_at
        ).getTime();

      if (
        Number.isNaN(expires)
      ) {
        return 'Pending';
      }

      const remaining =
        expires -
        Date.now();

      if (
        remaining <= 0
      ) {
        return 'Expired';
      }

      const minutes =
        Math.ceil(
          remaining /
            60000
        );

      if (
        minutes <= 1
      ) {
        return 'Expires <1 min';
      }

      return `Expires in ${minutes} min`;
    };

  // --------------------------------------------------
  // Age
  // --------------------------------------------------

  const getAgeLabel =
    (
      value: string
    ) => {
      const timestamp =
        new Date(
          value
        ).getTime();

      if (
        Number.isNaN(
          timestamp
        )
      ) {
        return 'Just now';
      }

      const minutes =
        Math.floor(
          (Date.now() -
            timestamp) /
            60000
        );

      if (
        minutes < 1
      ) {
        return 'Just now';
      }

      if (
        minutes < 60
      ) {
        return `${minutes} min ago`;
      }

      const hours =
        Math.floor(
          minutes /
            60
        );

      return `${hours} hr ago`;
    };

  // --------------------------------------------------
  // Accept / decline / cancel
  // --------------------------------------------------

  const updateInvitation =
    async (
      invitation: Invitation,
      newStatus:
        | 'accepted'
        | 'declined'
        | 'cancelled'
    ) => {
      if (!backendUserId) {
        return;
      }

      setActionId(
        invitation.id
      );

      setError('');

      try {
        const response =
          await fetch(
            `${API_BASE}/api/invitations/${invitation.id}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                user_id:
                  backendUserId,

                status:
                  newStatus,
              }),
            }
          );

        const result =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.detail ||
              'Unable to update invitation.'
          );
        }

        // Update local state immediately.
        setInvitations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                invitation.id
                  ? result
                  : item
            )
        );

        // If accepted, go directly into the meeting.
        if (
          newStatus ===
          'accepted'
        ) {
          window.location.href =
            `/meeting/${result.room_code}`;
        }
      } catch (error: any) {
        console.error(
          'Invitation update failed:',
          error
        );

        setError(
          error?.message ||
            'Unable to update invitation.'
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  // --------------------------------------------------
  // Empty / guest state
  // --------------------------------------------------

  if (
    !currentUser ||
    currentUser.isGuest
  ) {
    return null;
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <section
      className={
        styles.invitationSection
      }
      id="invitations"
    >
      <div
        className={
          styles.sectionHeader
        }
      >
        <h2
          className={
            styles.sectionTitle
          }
        >
          Invitations ({items.length})
        </h2>
      </div>

      {loading ? (
        <div
          className={
            styles.invitationEmpty
          }
        >
          Loading invitations...
        </div>
      ) : error ? (
        <div
          className={
            styles.alertError ||
            styles.invitationEmpty
          }
        >
          {error}
        </div>
      ) : !items.length ? (
        <div
          className={
            styles.invitationEmpty
          }
        >
          No meeting invitations yet.
        </div>
      ) : (
        <div
          className={
            styles.invitationList
          }
        >
          {items.map(
            (
              invitation
            ) => {
              const mine =
                invitation.sender_id ===
                backendUserId;

              const otherName =
                mine
                  ? invitation.receiver_name
                  : invitation.sender_name;

              const otherUsername =
                mine
                  ? invitation.receiver_username
                  : invitation.sender_username;

              const isPending =
                invitation.status ===
                'pending';

              const isReceived =
                !mine;

              const isActionRunning =
                actionId ===
                invitation.id;

              return (
                <div
                  className={
                    styles.invitationCard
                  }
                  key={
                    invitation.id
                  }
                >
                  <div
                    className={
                      styles.invitationAvatar
                    }
                  >
                    {otherName?.[0]?.toUpperCase() ||
                      '?'}
                  </div>

                  <div
                    className={
                      styles.invitationMain
                    }
                  >
                    <div
                      className={
                        styles.invitationTitle
                      }
                    >
                      {mine ? (
                        <>
                          You invited{' '}
                          <strong>
                            {otherName}
                          </strong>
                        </>
                      ) : (
                        <>
                          <strong>
                            {otherName}
                          </strong>{' '}
                          invited you
                        </>
                      )}
                    </div>

                    <div
                      className={
                        styles.invitationMeta
                      }
                    >
                      {invitation.meeting_title}{' '}
                      · Room{' '}
                      {
                        invitation.room_code
                      }
                    </div>

                    <div
                      className={
                        styles.invitationTime
                      }
                    >
                      {getAgeLabel(
                        invitation.created_at
                      )}
                    </div>

                    <div
                      style={{
                        fontSize:
                          '0.82rem',
                        color:
                          'var(--text-muted)',
                        marginTop:
                          '0.2rem',
                      }}
                    >
                      @{otherUsername}
                    </div>

                    {/* Receiver actions */}

                    {isReceived &&
                      isPending && (
                        <div
                          style={{
                            display:
                              'flex',
                            gap:
                              '0.6rem',
                            marginTop:
                              '0.8rem',
                          }}
                        >
                          <button
                            onClick={() =>
                              updateInvitation(
                                invitation,
                                'accepted'
                              )
                            }
                            disabled={
                              isActionRunning
                            }
                            style={{
                              border:
                                'none',
                              borderRadius:
                                '8px',
                              padding:
                                '0.45rem 0.8rem',
                              cursor:
                                isActionRunning
                                  ? 'default'
                                  : 'pointer',
                              background:
                                'var(--primary-gradient)',
                              color:
                                '#fff',
                              fontWeight:
                                700,
                            }}
                          >
                            {isActionRunning
                              ? '...'
                              : 'Accept'}
                          </button>

                          <button
                            onClick={() =>
                              updateInvitation(
                                invitation,
                                'declined'
                              )
                            }
                            disabled={
                              isActionRunning
                            }
                            style={{
                              border:
                                '1px solid var(--border-color)',
                              borderRadius:
                                '8px',
                              padding:
                                '0.45rem 0.8rem',
                              cursor:
                                isActionRunning
                                  ? 'default'
                                  : 'pointer',
                              background:
                                'transparent',
                              color:
                                'var(--text-muted)',
                              fontWeight:
                                700,
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                    {/* Sender cancellation */}

                    {mine &&
                      isPending && (
                        <div
                          style={{
                            marginTop:
                              '0.8rem',
                          }}
                        >
                          <button
                            onClick={() =>
                              updateInvitation(
                                invitation,
                                'cancelled'
                              )
                            }
                            disabled={
                              isActionRunning
                            }
                            style={{
                              border:
                                '1px solid var(--border-color)',
                              borderRadius:
                                '8px',
                              padding:
                                '0.4rem 0.75rem',
                              cursor:
                                isActionRunning
                                  ? 'default'
                                  : 'pointer',
                              background:
                                'transparent',
                              color:
                                'var(--text-muted)',
                              fontSize:
                                '0.8rem',
                              fontWeight:
                                700,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                  </div>

                  <div
                    className={
                      styles.invitationStatus
                    }
                  >
                    {getExpiryLabel(
                      invitation
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}