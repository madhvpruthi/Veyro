import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import {
  auth,
  db,
  UserProfile,
} from '../lib/firebase';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8000';

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  backendUserId: number | null;
  loading: boolean;
  setUserProfile: (
    profile: UserProfile | null
  ) => void;
}

const AuthContext =
  createContext<AuthContextType>({
    firebaseUser: null,
    userProfile: null,
    backendUserId: null,
    loading: true,
    setUserProfile: () => {},
  });

export const useAuth = () =>
  useContext(AuthContext);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [
    firebaseUser,
    setFirebaseUser,
  ] =
    useState<User | null>(null);

  const [
    userProfile,
    setUserProfile,
  ] =
    useState<UserProfile | null>(null);

  const [
    backendUserId,
    setBackendUserId,
  ] =
    useState<number | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setFirebaseUser(user);
          setBackendUserId(null);

          if (!user) {
            setUserProfile(null);
            setLoading(false);
            return;
          }

          let profile: UserProfile;

          try {
            const userDoc =
              await getDoc(
                doc(
                  db,
                  'users',
                  user.uid
                )
              );

            if (
              userDoc.exists()
            ) {
              profile =
                userDoc.data() as UserProfile;
            } else {
              profile = {
                uid: user.uid,
                username:
                  user.displayName
                    ?.toLowerCase()
                    .replace(
                      /\s+/g,
                      ''
                    ) ||
                  'user',
                name:
                  user.displayName ||
                  'User',
                email:
                  user.email ||
                  '',
                isGuest:
                  user.isAnonymous,
              };
            }
          } catch (error) {
            console.error(
              'Unable to load Firebase profile:',
              error
            );

            profile = {
              uid: user.uid,
              username:
                user.displayName
                  ?.toLowerCase()
                  .replace(
                    /\s+/g,
                    ''
                  ) ||
                'user',
              name:
                user.displayName ||
                'User',
              email:
                user.email ||
                '',
              isGuest:
                user.isAnonymous,
            };
          }

          setUserProfile(profile);

          // ------------------------------------------
          // Firebase → SQLite synchronization
          // ------------------------------------------

          try {
            const response =
              await fetch(
                `${API_BASE}/api/auth/sync`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type':
                      'application/json',
                  },
                  body: JSON.stringify({
                    firebase_uid:
                      profile.uid,

                    name:
                      profile.name,

                    username:
                      profile.username,

                    email:
                      profile.email ||
                      `guest_${profile.uid}@veyro.local`,

                    is_guest:
                      profile.isGuest,
                  }),
                }
              );

            if (!response.ok) {
              console.error(
                'SQLite user synchronization failed:',
                await response.text()
              );
            } else {
              const backendUser =
                await response.json();

              setBackendUserId(
                Number(
                  backendUser.id
                )
              );

              /*
               * Important:
               * Use the backend's canonical username.
               *
               * This prevents the UI from displaying
               * stale localStorage/Firebase username data.
               */
              if (
                backendUser.username
              ) {
                setUserProfile(
                  (previous) =>
                    previous
                      ? {
                          ...previous,
                          username:
                            backendUser.username,
                        }
                      : previous
                );
              }
            }
          } catch (error) {
            console.error(
              'SQLite user synchronization failed:',
              error
            );
          }

          setLoading(false);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        backendUserId,
        loading,
        setUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;