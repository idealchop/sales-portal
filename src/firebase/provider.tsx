
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, DependencyList } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { UserProvider } from './auth/use-user';
import { initializeFirebase } from './index'; // Import the new initializer

// This interface defines the shape of our Firebase services context
interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  isFirebaseLoading: boolean;
}

// This is the actual context object
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * This is the main provider component. It is responsible for initializing Firebase
 * and providing the services to the rest of the application.
 * It will show a loading indicator until Firebase is ready.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to hold the initialized Firebase services
  const [firebaseServices, setFirebaseServices] = useState<{
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  // This effect runs only once on the client to initialize Firebase
  useEffect(() => {
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, []);

  // useMemo ensures the context value is stable between re-renders
  const contextValue = useMemo(() => {
    const isLoading = !firebaseServices;
    return {
      isFirebaseLoading: isLoading,
      firebaseApp: firebaseServices?.firebaseApp,
      auth: firebaseServices?.auth,
      firestore: firebaseServices?.firestore,
    };
  }, [firebaseServices]) as FirebaseContextState;

  // CRITICAL: Do not render children until Firebase is fully initialized.
  // This prevents any component from accessing null Firebase services.
  if (contextValue.isFirebaseLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Once loaded, provide the context to the rest of the app.
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
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};


// --- UTILITY HOOK for memoization ---

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
