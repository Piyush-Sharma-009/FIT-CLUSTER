import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page refresh using stored JWT
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('fitcluster_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        if ([401, 403].includes(error.response?.status)) {
          localStorage.removeItem('fitcluster_token');
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const signup = async (formData) => {
    const { data } = await API.post('/auth/signup', formData);
    localStorage.setItem('fitcluster_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (formData) => {
    const { data } = await API.post('/auth/login', formData);
    localStorage.setItem('fitcluster_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('fitcluster_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, setUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);