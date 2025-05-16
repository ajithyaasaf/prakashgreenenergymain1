import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, firestore } from "@/firebase/config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'employee' | 'admin' | 'master_admin';
  department?: string;
}

interface AuthContextProps {
  currentUser: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initializing: boolean;
  isAuthenticated: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();

  async function getUserData(user: FirebaseUser): Promise<UserData> {
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as Omit<UserData, 'uid' | 'email' | 'displayName'>;
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: userData.role || 'employee',
      };
    } else {
      // Default to employee if no role is found
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'employee',
      };
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userData = await getUserData(user);
          setCurrentUser(userData);
        } catch (error) {
          console.error("Error getting user data:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUserData(userCredential.user);
      setCurrentUser(userData);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.displayName || email}!`,
      });
    } catch (error: any) {
      let message = "Failed to login";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        message = "Invalid email or password";
      }
      toast({
        title: "Login Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async function register(email: string, password: string, name: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with name
      await updateProfile(user, { displayName: name });
      
      // Create user document in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        role: 'employee', // Default role for new users
        createdAt: new Date().toISOString(),
      });
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: 'employee' as const,
      };
      
      setCurrentUser(userData);
      
      toast({
        title: "Registration Successful",
        description: `Welcome to Prakash Energy, ${name}!`,
      });
    } catch (error: any) {
      let message = "Failed to register";
      if (error.code === "auth/email-already-in-use") {
        message = "Email already in use";
      }
      toast({
        title: "Registration Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      toast({
        title: "Logout Successful",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }

  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      let message = "Failed to send password reset email";
      if (error.code === "auth/user-not-found") {
        message = "No user found with this email";
      }
      toast({
        title: "Password Reset Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    resetPassword,
    initializing,
    isAuthenticated: currentUser !== null,
    isEmployee: currentUser?.role === 'employee',
    isAdmin: ['admin', 'master_admin'].includes(currentUser?.role || ''),
    isMasterAdmin: currentUser?.role === 'master_admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
