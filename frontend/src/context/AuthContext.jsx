import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem("jansuvidha_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        if (data.user.preferredLanguage) i18n.changeLanguage(data.user.preferredLanguage);
      })
      .catch(() => localStorage.removeItem("jansuvidha_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (phone, password) => {
    const { data } = await api.post("/auth/login", { phone, password });
    if (data.requiresTwoFactor) return data;
    localStorage.setItem("jansuvidha_token", data.token);
    setUser(data.user);
    if (data.user.preferredLanguage) i18n.changeLanguage(data.user.preferredLanguage);
    return data.user;
  };

  const loginWithOtp = async (phone, code) => {
    const { data } = await api.post("/auth/otp/login", { phone, code });
    localStorage.setItem("jansuvidha_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("jansuvidha_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("jansuvidha_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, loginWithOtp, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
