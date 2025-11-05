
'use client';
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth, useFirebase } from '@/firebase/provider'; 

interface UserContextType {
  user: User | null;
  isUserLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  // Use the main firebase hook to get both auth and loading state
  const { auth, isFirebaseLoading } = useFirebase(); 
  const [user, setUser] = useState<User | null>(null);
  // User is loading if Firebase is loading OR if we haven't received the first auth state update yet
  const [isAuthLoading, setIsAuthLoading] = useState(true); 

  useEffect(() => {
    // Only subscribe if Firebase is fully loaded and auth is available
    if (!isFirebaseLoading && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setIsAuthLoading(false); // Auth state has been determined
      });
      return () => unsubscribe();
    }
  }, [auth, isFirebaseLoading]); // Rerun when firebase is ready

  return (
    <UserContext.Provider value={{ user, isUserLoading: isFirebaseLoading || isAuthLoading }}>
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
