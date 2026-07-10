/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
axios.defaults.withCredentials = true;

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
      if (data.requiresTwoFactor) {
        return data;
      }
      setUserInfo(data);
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  };

  const verifyTwoFactorLogin = async ({ challengeId, code }) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/users/login/2fa', { challengeId, code }, config);
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

  const refreshSession = async () => {
    try {
      const { data } = await axios.post('/api/users/refresh');
      setUserInfo(data);
      return data;
    } catch (error) {
      setUserInfo(null);
      throw error.response?.data?.message || error.message;
    }
  };

  const logout = async () => {
    try {
      if (userInfo?.token) {
        await axios.post(
          '/api/users/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error(error);
    }
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ userInfo, login, verifyTwoFactorLogin, register, refreshSession, syncUserInfo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
