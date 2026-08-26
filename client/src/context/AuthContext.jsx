import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexstore_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' or 'signup'
  const { addToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const storedToken = localStorage.getItem('nexstore_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data && res.data.data) {
            setUser(res.data.data);
          }
        } catch (err) {
          console.warn('Could not restore user session:', err.message);
          // If token invalid, clear
          localStorage.removeItem('nexstore_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const signin = async (email, password) => {
    try {
      const res = await api.post('/auth/signin', { email, password });
      const jwtToken = res.data.data.token;
      const userData = res.data.data.user || { email, role: 'customer' };

      localStorage.setItem('nexstore_token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
      setIsAuthModalOpen(false);
      addToast(`Welcome back, ${userData.name || userData.email}!`, 'success');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Invalid credentials';
      addToast(msg, 'danger');
      return { success: false, error: msg };
    }
  };

  const signup = async ({ name, email, password, role = 'customer' }) => {
    try {
      const res = await api.post('/auth/signup', { name, email, password, role });
      const jwtToken = res.data.data.token;
      const userData = res.data.data.user || { name, email, role };

      if (jwtToken) {
        localStorage.setItem('nexstore_token', jwtToken);
        setToken(jwtToken);
      }
      setUser(userData);
      setIsAuthModalOpen(false);
      addToast('Account created successfully!', 'success');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
      addToast(msg, 'danger');
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('nexstore_token');
    setToken(null);
    setUser(null);
    addToast('You have been logged out.', 'info');
  };

  const openAuthModal = (mode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signin,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
