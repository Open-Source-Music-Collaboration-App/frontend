import React, { useEffect } from "react";
import axios from "axios";
import { useContext, createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProviderProps {
  user: object | null,
  logout(): void,
}

const AuthContext = createContext<ProviderProps>({
  user: null,
  logout: () => { }
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<object | null>(null)
  useEffect(() => {
    if (!user) {
      axios.get("http://localhost:3333/api/me", { withCredentials: true })
        .then(resp => {
          setUser(resp.data.user);
        })
        .catch(() => console.log('Not authenticated'))
    }
  }, [])

  const logout = () => {
    axios.get("http://localhost:3333/logout", { withCredentials: true }).then(() => {
      setUser(null);
    });
  };
  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>)
}

export const useAuth = () => {
  return useContext(AuthContext);
}

export default AuthProvider;