import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login } from "@/api/auth";
import type { LoginForm } from "@/api/auth";
import { setAuthToken } from "@/api/axios";

export interface User {
    id: number;
    username: string;
    email: string;
    role: "admin" | "worker";
}

interface AuthContextType {
    user: User | null;
    loginUser: (data: LoginForm) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    const loginUser = async (data: LoginForm) => {
        const tokenData = await login(data);
        setAuthToken(tokenData.access_token);
        localStorage.setItem("token", tokenData.access_token);
        const profile = await getMe();
        setUser(profile);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("token");
        setAuthToken(null);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setAuthToken(token);
            getMe().then(setUser).catch(logout);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loginUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
