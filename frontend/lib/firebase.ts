import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Replace with your Firebase Project Configuration from Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Keep the Veyro login alive across page changes and browser restarts.
// This is the Veyro/Firebase session; it is independent of the Jitsi iframe.
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Could not enable local Firebase auth persistence:', error);
  });
}

export const db = getFirestore(app);

export interface UserProfile {
  uid: string;
  username: string;
  name: string;
  email: string;
  isGuest: boolean;
  createdAt?: any;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const cleanUser = username.toLowerCase().trim().replace('@', '');
  const q = query(collection(db, 'users'), where('username', '==', cleanUser));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

export async function saveUserProfileToFirestore(profile: UserProfile): Promise<void> {
  const userRef = doc(db, 'users', profile.uid);
  await setDoc(userRef, {
    ...profile,
    username: profile.username.toLowerCase().trim().replace('@', ''),
    createdAt: serverTimestamp()
  }, { merge: true });
}

export async function findUserByUsername(username: string): Promise<UserProfile | null> {
  const cleanUser = username.toLowerCase().trim().replace('@', '');
  const q = query(collection(db, 'users'), where('username', '==', cleanUser));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].data() as UserProfile;
  }
  return null;
}

export async function searchUsersByUsername(
  username: string
): Promise<UserProfile[]> {
  const cleanUser = username
    .toLowerCase()
    .trim()
    .replace(/^@/, '');

  if (cleanUser.length < 2) {
    return [];
  }

  const usersRef = collection(db, 'users');

  const q = query(
    usersRef,
    where('username', '>=', cleanUser),
    where('username', '<=', cleanUser + '\uf8ff')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => doc.data() as UserProfile)
    .filter((user) => !user.isGuest);
}

// Keep your existing invitation helper.
export async function sendMeetingInvite(
  sender: UserProfile,
  targetUsername: string,
  meetingId: string,
  meetingTitle?: string,
  expiryMinutes: number = 10
) {
  const targetUser = await findUserByUsername(targetUsername);
  if (!targetUser) {
    throw new Error(`User @${targetUsername} not found.`);
  }

  const safeExpiry = Math.min(Math.max(Number(expiryMinutes) || 10, 1), 1440);
  const expiresAt = new Date(Date.now() + safeExpiry * 60 * 1000);

  return await addDoc(collection(db, 'meeting_requests'), {
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderName: sender.name,
    targetUid: targetUser.uid,
    targetUsername: targetUser.username,
    targetName: targetUser.name,
    targetEmail: targetUser.email,
    meetingId,
    meetingTitle: meetingTitle || 'Veyro Meeting Room',
    status: 'pending',
    expiryMinutes: safeExpiry,
    createdAt: serverTimestamp(),
    expiresAt,
  });
}

// Convert Firestore Timestamp / Date / number / string to milliseconds
export function timestampToMillis(value: any): number | null {
  if (!value) return null;

  // Firestore Timestamp
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  // JavaScript Date
  if (value instanceof Date) {
    return value.getTime();
  }

  // Unix timestamp
  if (typeof value === 'number') {
    return value;
  }

  // ISO date string
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}
