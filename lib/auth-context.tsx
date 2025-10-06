/**
 * Authentication Context Provider
 * 
 * Manages user authentication state throughout the StockMento application.
 * Provides login, logout, signup functionality with persistent storage.
 * Currently uses mock data but ready for backend integration.
 */

"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, LoginCredentials, SignupData, AuthContextType } from '@/lib/types';
import { saveToStorage, loadFromStorage, removeFromStorage, STORAGE_KEYS } from '@/lib/data-utils';
import { mockUsers } from '@/lib/mock-data';

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing user session on mount
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    setLoading(true);
    try {
      const savedUser = loadFromStorage<AuthUser>(STORAGE_KEYS.USER);
      if (savedUser) {
        setUser(savedUser);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication - find user by email
      const foundUser = mockUsers.find(u => u.email === credentials.email);
      
      if (!foundUser) {
        throw new Error('User not found');
      }

      // In real app, password would be verified on backend
      // For mock, we'll accept any password for existing users
      
      const authUser: AuthUser = {
        id: foundUser.id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        avatar: foundUser.avatar,
      };

      setUser(authUser);
      saveToStorage(STORAGE_KEYS.USER, authUser);
      
      // Update last login in mock data (in real app, this would be handled by backend)
      foundUser.lastLogin = new Date();
      
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Check if user already exists
      const existingUser = mockUsers.find(u => u.email === data.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: undefined,
        role: 'student' as const,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        profileCompleted: false,
      };

      // Add to mock users (in real app, this would be handled by backend)
      mockUsers.push(newUser);

      const authUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        avatar: newUser.avatar,
      };

      setUser(authUser);
      saveToStorage(STORAGE_KEYS.USER, authUser);
      
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    removeFromStorage(STORAGE_KEYS.USER);
    // Clear other user-specific data
    removeFromStorage(STORAGE_KEYS.PROGRESS);
    removeFromStorage(STORAGE_KEYS.PREFERENCES);
    // Redirect to landing page
    router.push('/');
  };

  const resetPassword = async (email: string): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user exists
      const foundUser = mockUsers.find(u => u.email === email);
      if (!foundUser) {
        throw new Error('No user found with this email address');
      }

      // In real app, this would send a password reset email
      console.log('Password reset email sent to:', email);
      
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user is authenticated
export function useAuthGuard(): boolean {
  const { user } = useAuth();
  return !!user;
}

// Hook for checking if user has specific role
export function useRole(role: 'student' | 'admin'): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'student' | 'admin'
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
        </div>
      );
    }

    if (!user) {
      // Redirect to signin page
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}