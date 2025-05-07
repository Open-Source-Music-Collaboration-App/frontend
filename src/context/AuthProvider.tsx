import React, { useEffect } from "react";
import axios from "axios";
import { useContext, createContext, useState } from "react";

interface ProviderProps {
  loading: boolean,
  user: object | null,
  logout(): void,
}

const AuthContext = createContext<ProviderProps>({
  loading: true,
  user: null,
  logout: () => { },
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<object | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    if (!user) {
      axios.get(`/api/me`, { withCredentials: true })
        .then(resp => {
          setUser(resp.data.user);
        })
        .catch(() => console.log('Not authenticated'))
        .finally(() => setLoading(false))
    }
  }, [])

  const logout = () => {
    axios.get(`/logout`, { withCredentials: true }).then(() => {
      setUser(null);
      // navigate("/");
    });
  };
  return (
    <AuthContext.Provider value={{ loading, user, logout }}>
      {children}
    </AuthContext.Provider>)
}

export const useAuth = () => {
  return useContext(AuthContext);
}

export default AuthProvider;