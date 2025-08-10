import { createContext, useContext, useEffect, useState } from "react";
import {
    getMe,
    login,
    register,
    logout as apiLogout,
    refreshToken,
    getUserSessions,
    revokeSession,
    revokeAllSessions,
} from "@/api/auth";
import type { LoginForm, RegisterForm, UserSession } from "@/api/auth";
import { setAuthToken } from "@/api/axios";
import { useNavigate } from "react-router-dom";

function decodeJwt(token: string) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(function (c) {
                    return (
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                    );
                })
                .join("")
        );

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    loginUser: (data: LoginForm) => Promise<void>;
    registerUser: (data: RegisterForm) => Promise<void>;
    logout: () => Promise<void>;
    sessions: UserSession[];
    loadingSessions: boolean;
    fetchSessions: () => Promise<void>;
    revokeUserSession: (sessionId: number) => Promise<void>;
    revokeAllUserSessions: (keepCurrent?: boolean) => Promise<void>;
    currentSessionId: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(
        null
    );
    const navigate = useNavigate();

    const loginUser = async (data: LoginForm) => {
        try {
            const tokenData = await login(data);

            setAuthToken(tokenData.access_token);

            if (data.remember_me) {
                localStorage.setItem("access_token", tokenData.access_token);
                const decodedToken = decodeJwt(tokenData.access_token);
                if (decodedToken && decodedToken.session_id) {
                    setCurrentSessionId(decodedToken.session_id);
                }
            } else {
                sessionStorage.setItem("access_token", tokenData.access_token);
            }

            const profile = await getMe();
            setUser(profile);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const registerUser = async (registerData: RegisterForm) => {
        await register(registerData);
    };

    const logout = async () => {
        try {
            await apiLogout();

            setUser(null);
            localStorage.removeItem("access_token");
            sessionStorage.removeItem("access_token");
            setAuthToken(null);

            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);

            setUser(null);
            localStorage.removeItem("access_token");
            sessionStorage.removeItem("access_token");
            setAuthToken(null);
            navigate("/login");
        }
    };

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const userSessions = await getUserSessions();
            setSessions(userSessions);
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const revokeUserSession = async (sessionId: number) => {
        try {
            await revokeSession(sessionId);
            await fetchSessions();
        } catch (error) {
            console.error("Failed to revoke session:", error);
            throw error;
        }
    };

    const revokeAllUserSessions = async (keepCurrent: boolean = true) => {
        try {
            await revokeAllSessions(keepCurrent);

            if (!keepCurrent) {
                await logout();
            } else {
                await fetchSessions();
            }
        } catch (error) {
            console.error("Failed to revoke all sessions:", error);
            throw error;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);

            const token =
                localStorage.getItem("access_token") ||
                sessionStorage.getItem("access_token");

            if (token) {
                try {
                    setAuthToken(token);
                    const decodedToken = decodeJwt(token);
                    if (decodedToken && decodedToken.session_id) {
                        setCurrentSessionId(decodedToken.session_id);
                    }

                    const profile = await getMe();
                    setUser(profile);
                } catch (error) {
                    console.error("Token validation failed:", error);

                    try {
                        const refreshData = await refreshToken();
                        setAuthToken(refreshData.access_token);

                        const decodedRefreshToken = decodeJwt(
                            refreshData.access_token
                        );
                        if (
                            decodedRefreshToken &&
                            decodedRefreshToken.session_id
                        ) {
                            setCurrentSessionId(decodedRefreshToken.session_id);
                        }

                        if (localStorage.getItem("access_token")) {
                            localStorage.setItem(
                                "access_token",
                                refreshData.access_token
                            );
                        } else {
                            sessionStorage.setItem(
                                "access_token",
                                refreshData.access_token
                            );
                        }

                        const profile = await getMe();
                        setUser(profile);
                    } catch (refreshError) {
                        console.error("Token refresh failed:", refreshError);
                        localStorage.removeItem("access_token");
                        sessionStorage.removeItem("access_token");
                        setAuthToken(null);
                    }
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                loginUser,
                registerUser,
                logout,
                sessions,
                loadingSessions,
                fetchSessions,
                revokeUserSession,
                revokeAllUserSessions,
                currentSessionId,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
