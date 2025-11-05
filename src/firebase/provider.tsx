
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { UserProvider } from './auth/use-user';
import { initializeFirebase } from './index';

interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  isFirebaseLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Omit<FirebaseContextState, 'isFirebaseLoading'>>({
    firebaseApp: null,
    auth: null,
    firestore: null,
  });

  useEffect(() => {
    // This effect runs once on the client to initialize Firebase.
    const { firebaseApp, auth, firestore } = initializeFirebase();
    setServices({ firebaseApp, auth, firestore });
  }, []);

  const contextValue = useMemo(() => {
    const isLoading = !services.auth || !services.firestore || !services.firebaseApp;
    return {
      ...services,
      isFirebaseLoading: isLoading,
    };
  }, [services]);

  // CRITICAL: Do not render children until Firebase is fully initialized.
  // This prevents any component from trying to access null Firebase services.
  if (contextValue.isFirebaseLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  // The UserProvider now safely sits inside, guaranteed to receive a valid auth instance.
  return (
    <FirebaseContext.Provider value={contextValue}>
      <UserProvider>{children}</UserProvider>
    </FirebaseContext.Provider>
  );
};

// --- HOOKS to access Firebase services ---

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth => {
  const { auth, isFirebaseLoading } = useFirebase();
  if (isFirebaseLoading) {
    throw new Error("Firebase Auth is not available yet. Ensure component is rendered within a fully loaded FirebaseProvider.");
  }
  return auth!;
};

export const useFirestore = (): Firestore => {
  const { firestore, isFirebaseLoading } = useFirebase();
  if (isFirebaseLoading) {
    throw new Error("Firebase Firestore is not available yet. Ensure component is rendered within a fully loaded FirebaseProvider.");
  }
  return firestore!;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp, isFirebaseLoading } = useFirebase();
  if (isFirebaseLoading) {
    throw new Error("Firebase App is not available yet. Ensure component is rendered within a fully loaded FirebaseProvider.");
  }
  return firebaseApp!;
};

// --- UTILITY HOOK for memoization ---

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
