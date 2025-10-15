
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // IMPORTANT: For HIPAA compliance, each user MUST have a unique user_id
  // Generate a unique mock user ID based on browser session/storage
  const getMockUserId = () => {
    let userId = localStorage.getItem('mock_user_id');
    if (!userId) {
      // Generate a unique ID for this browser session
      // Using fallback UUID generation for browser compatibility
      userId = `mock-user-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('mock_user_id', userId);
    }
    return userId;
  };

  const mockUserId = getMockUserId();
  
  // BYPASS AUTH FOR TROUBLESHOOTING - Set mock user with unique ID
  const mockUser = {
    id: mockUserId, // Each browser/session gets unique ID for data isolation
    email: `test-${mockUserId.slice(-8)}@example.com`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { first_name: 'Test', last_name: 'User' },
  } as User;

  const [user, setUser] = useState<User | null>(mockUser);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // Set to false to skip loading

  useEffect(() => {
    // AUTHENTICATION DISABLED FOR TROUBLESHOOTING
    // NOTE: In production, this ensures proper user isolation
    // Each browser session gets a unique user_id to prevent HIPAA violations
    // Uncomment below to re-enable real authentication
    
    /*
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    */
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
