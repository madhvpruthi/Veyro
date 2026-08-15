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


  const parseBackendUtc = (value: string): number => {
  if (!value) {
    return NaN;
  }

  const normalized =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
      ? value
      : `${value}Z`;

  return new Date(normalized).getTime();
};

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
  type FilterType = 'all' | 'received' | 'sent';

const [filter, setFilter] =
  useState<FilterType>('all');

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
          parseBackendUtc(
  b.created_at
) -
parseBackendUtc(
  a.created_at
)
      );
    },
    [invitations]
  );

  const filteredItems = useMemo(() => {
  if (!backendUserId) {
    return [];
  }

  if (filter === 'received') {
    return items.filter(
      (invitation) =>
        invitation.receiver_id === backendUserId
    );
  }

  if (filter === 'sent') {
    return items.filter(
      (invitation) =>
        invitation.sender_id === backendUserId
    );
  }

  return items;
}, [
  items,
  filter,
  backendUserId,
]);

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
  parseBackendUtc(
    invitation.expires_at
  );
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

    const isInvitationExpired = (
  invitation: Invitation
) => {
  if (invitation.status === 'expired') {
    return true;
  }

  if (invitation.status !== 'pending') {
    return false;
  }

  const expiresAt =
  parseBackendUtc(
    invitation.expires_at
  );

  return (
    !Number.isNaN(expiresAt) &&
    expiresAt <= Date.now()
  );
};

  // --------------------------------------------------
  // Age
  // --------------------------------------------------

  const getAgeLabel =
    (
      value: string
    ) => {
      
        const timestamp =
  parseBackendUtc(
    value
  );

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
  className={styles.sectionHeader}
  style={{
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: '1rem',
  }}
>
  <div>
    <h2
      className={styles.sectionTitle}
    >
      Invitations
    </h2>

    <p
      style={{
        margin: '0.35rem 0 0',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}
    >
      Manage your Veyro meeting invitations
    </p>
  </div>

  {/* Invitation tabs */}
  <div
    style={{
      width: '100%',
      maxWidth: '540px',
      display: 'grid',
      gridTemplateColumns:
        'repeat(3, 1fr)',
      gap: '4px',
      padding: '4px',
      borderRadius: '14px',
      border:
        '1px solid var(--border-color)',
      background:
        'rgba(255,255,255,0.025)',
    }}
  >
    {(
      [
        ['all', 'All'],
        ['received', 'Received'],
        ['sent', 'Sent'],
      ] as const
    ).map(([value, label]) => {
      const active =
        filter === value;

      const count =
        value === 'all'
          ? items.length
          : value === 'received'
          ? items.filter(
              (invitation) =>
                invitation.receiver_id ===
                backendUserId
            ).length
          : items.filter(
              (invitation) =>
                invitation.sender_id ===
                backendUserId
            ).length;

      return (
        <button
          key={value}
          type="button"
          onClick={() =>
            setFilter(value)
          }
          style={{
            border: 'none',
            borderRadius: '10px',
            padding:
              '0.65rem 0.8rem',
            background: active
              ? 'rgba(99,102,241,0.16)'
              : 'transparent',
            color: active
              ? '#fff'
              : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.84rem',
            fontWeight: 700,
            transition:
              'all 0.2s ease',
            boxShadow: active
              ? '0 0 20px rgba(99,102,241,0.12)'
              : 'none',
          }}
        >
          {label}{' '}
          <span
            style={{
              opacity: active
                ? 1
                : 0.65,
              marginLeft: '3px',
            }}
          >
            {count}
          </span>
        </button>
      );
    })}
  </div>
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
      ) : !filteredItems.length ? (
        <div
          className={
            styles.invitationEmpty
          }
        >
          No meeting invitations yet.
        </div>
      ) : (
        <div
  className={styles.invitationList}
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '0.7rem',
  }}
>
         {filteredItems.map(
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

              const isExpired =
  isInvitationExpired(invitation);

const isPending =
  invitation.status === 'pending' &&
  !isExpired;

              const isReceived =
                !mine;

              const isActionRunning =
                actionId ===
                invitation.id;

              return (
  <div
    className={styles.invitationCard}
    key={invitation.id}
    style={{
      display: 'grid',
      gridTemplateColumns:
        '52px minmax(220px, 1.5fr) minmax(180px, 1fr) auto',
      alignItems: 'center',
      gap: '1.25rem',
      padding: '1rem 1.15rem',
      border:
        '1px solid var(--border-color)',
      borderRadius: '14px',
      background:
        'rgba(255,255,255,0.025)',
      transition:
        'border-color 0.2s ease, background 0.2s ease',
      minHeight: '86px',
    }}
  >

    {/* Avatar */}
    <div
      className={styles.invitationAvatar}
      style={{
        width: '46px',
        height: '46px',
        minWidth: '46px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'rgba(99,102,241,0.12)',
        border:
          '1px solid rgba(99,102,241,0.22)',
        color: '#a5b4fc',
        fontWeight: 800,
        fontSize: '1rem',
      }}
    >
      {otherName?.[0]?.toUpperCase() || '?'}
    </div>


    {/* Main information */}
    <div
      style={{
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
          marginBottom: '0.35rem',
        }}
      >
        {mine ? (
          <>
            <span>You invited</span>
            <strong>{otherName}</strong>
          </>
        ) : (
          <>
            <strong>{otherName}</strong>
            <span>invited you</span>
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          flexWrap: 'wrap',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
        }}
      >
        <span>
          {getAgeLabel(
            invitation.created_at
          )}
        </span>

        <span
          style={{
            opacity: 0.35,
          }}
        >
          •
        </span>

        <span>
          @{otherUsername}
        </span>
      </div>
    </div>


    {/* Meeting information */}
    <div
      style={{
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: 'var(--text-primary)',
          fontSize: '0.84rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {invitation.meeting_title}
      </div>

      <div
        style={{
          marginTop: '0.3rem',
          color: 'var(--text-muted)',
          fontSize: '0.76rem',
        }}
      >
        Room {invitation.room_code}
      </div>
    </div>


    {/* Right side */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.65rem',
        minWidth: '190px',
      }}
    >

      {/* Received + active */}
      {isReceived &&
        isPending && (
          <>
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
                border: 'none',
                borderRadius: '8px',
                padding:
                  '0.48rem 0.85rem',
                cursor:
                  isActionRunning
                    ? 'default'
                    : 'pointer',
                background:
                  'var(--primary-gradient)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.78rem',
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
                borderRadius: '8px',
                padding:
                  '0.48rem 0.85rem',
                cursor:
                  isActionRunning
                    ? 'default'
                    : 'pointer',
                background:
                  'transparent',
                color:
                  'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
              }}
            >
              Decline
            </button>
          </>
        )}


      {/* Sender + active */}
      {mine &&
        isPending && (
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
              borderRadius: '8px',
              padding:
                '0.48rem 0.85rem',
              cursor:
                isActionRunning
                  ? 'default'
                  : 'pointer',
              background:
                'transparent',
              color:
                'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {isActionRunning
              ? '...'
              : 'Cancel'}
          </button>
        )}


      {/* Expired */}
      {isExpired && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding:
              '0.4rem 0.7rem',
            borderRadius: '7px',
            background:
              'rgba(148,163,184,0.08)',
            border:
              '1px solid rgba(148,163,184,0.15)',
            color:
              'var(--text-muted)',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          Expired
        </span>
      )}


      {/* Other final statuses */}
      {!isExpired &&
        !isPending && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding:
                '0.4rem 0.7rem',
              borderRadius: '7px',
              background:
                'rgba(148,163,184,0.08)',
              border:
                '1px solid rgba(148,163,184,0.15)',
              color:
                'var(--text-muted)',
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            {invitation.status}
          </span>
        )}


      {/* Active expiry */}
      {isPending && (
        <span
          style={{
            color:
              'var(--text-muted)',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
          }}
        >
          {getExpiryLabel(
            invitation
          )}
        </span>
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