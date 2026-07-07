/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => {
    const localData = localStorage.getItem('userInfo');
    return localData ? JSON.parse(localData) : null;
  });

  useEffect(() => {
    if (userInfo) {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('userInfo');
    }
  }, [userInfo]);

  const login = async (email, password) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/users/login', { email, password }, config);
      setUserInfo(data);
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  };

  const register = async ({ name, email, password, confirmPassword, phone = '' }) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post(
        '/api/users',
        { name, email, password, confirmPassword, phone },
        config
      );
      setUserInfo(data);
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  };

  const syncUserInfo = (nextUserInfo) => {
    setUserInfo(nextUserInfo);
  };

  const logout = () => {
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ userInfo, login, register, syncUserInfo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
