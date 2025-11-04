'use client';
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth'; // Correctly import User type
import { useAuth } from '@/firebase/provider'; // Ensure useAuth provides the auth instance

// Define the shape of the user context
interface UserContextType {
  user: User | null;
  isUserLoading: boolean;
}

// Create the context with a default undefined value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Define the props for the provider component
interface UserProviderProps {
  children: ReactNode;
}

/**
 * Provides user authentication state to its children.
 */
export const UserProvider = ({ children }: UserProviderProps) => {
  const auth = useAuth(); // Get the auth instance from the parent FirebaseProvider
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    });

    // Unsubscribe on cleanup
    return () => unsubscribe();
  }, [auth]); // Re-run effect if auth instance changes

  return (
    <UserContext.Provider value={{ user, isUserLoading }}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to access user authentication state.
 * Throws an error if used outside of a UserProvider.
 */
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
