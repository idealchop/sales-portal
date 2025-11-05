'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp, getApps, initializeApp, getApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Auth, getAuth } from 'firebase/auth';
import { UserProvider } from './auth/use-user';
import { firebaseConfig } from './config';

interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  isFirebaseLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// This function initializes Firebase and returns the SDK instances
function initializeFirebase() {
  if (getApps().length === 0) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
       if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp)
    };
  }
  
  const app = getApp();
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app)
  };
}

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [firebase, setFirebase] = useState<Omit<FirebaseContextState, 'isFirebaseLoading'> | null>(null);

  useEffect(() => {
    // This effect runs only once on the client
    const services = initializeFirebase();
    setFirebase(services);
  }, []);

  const contextValue = useMemo(() => {
    const isLoading = !firebase;
    return {
      isFirebaseLoading: isLoading,
      firebaseApp: firebase?.firebaseApp,
      firestore: firebase?.firestore,
      auth: firebase?.auth,
    };
  }, [firebase]) as FirebaseContextState;

  // Do not render children until Firebase is initialized
  if (contextValue.isFirebaseLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <UserProvider>
        {children}
      </UserProvider>
    </FirebaseContext.Provider>
  );
};


export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth, isFirebaseLoading } = useFirebase();
  if (isFirebaseLoading) {
    throw new Error("useAuth() hook called while Firebase is loading. This is not allowed. Ensure components using this hook are rendered only after Firebase is initialized.");
  }
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore, isFirebaseLoading } = useFirebase();
  if (isFirebaseLoading) {
    throw new Error("useFirestore() hook called while Firebase is loading. This is not allowed. Ensure components using this hook are rendered only after Firebase is initialized.");
  }
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp, isFirebaseLoading } = useFirebase();
   if (isFirebaseLoading) {
    throw new Error("useFirebaseApp() hook called while Firebase is loading. This is not allowed. Ensure components using this hook are rendered only after Firebase is initialized.");
  }
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
