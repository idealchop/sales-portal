'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { initializeFirebase } from '@/firebase';

// This context will hold the raw, potentially null, Firebase services
const FirebaseClientContext = createContext<any>(null);

// This provider is responsible for initializing Firebase ONCE on the client
export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const [firebase, setFirebase] = useState<any | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client
    const services = initializeFirebase();
    setFirebase(services);
    setIsFirebaseLoading(false);
  }, []);

  return (
    <FirebaseClientContext.Provider value={{ ...firebase, isFirebaseLoading }}>
      {children}
    </FirebaseClientContext.Provider>
  );
};

// Custom hook to use the client-side Firebase context
export const useFirebaseClient = () => {
  const context = useContext(FirebaseClientContext);
  if (context === undefined) {
    throw new Error('useFirebaseClient must be used within a FirebaseClientProvider');
  }
  return context;
};
