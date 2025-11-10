
'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirebase, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/definitions';

interface UserContextType {
  user: (User & Partial<UserProfile>) | null;
  isUserLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const { auth, isFirebaseLoading } = useFirebase();
  const firestore = useFirestore();
  const [user, setUser] = useState<(User & Partial<UserProfile>) | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseLoading && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDocRef = doc(firestore, 'sales', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userProfileData = userDocSnap.data() as UserProfile;
            setUser({ ...firebaseUser, ...userProfileData });
          } else {
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
        }
        setIsAuthLoading(false);
      });
      return () => unsubscribe();
    }
  }, [auth, isFirebaseLoading, firestore]);

  const isAdmin = user?.email === 'admin@smartrefill.io';
  const isManager = user?.role === 'manager';

  return (
    <UserContext.Provider value={{ user, isUserLoading: isFirebaseLoading || isAuthLoading, isAdmin, isManager }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
