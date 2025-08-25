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
import type {
    LoginForm,
    RegisterForm,
    UserSession,
    LoginRequires2FA,
} from "@/api/auth";
import { login2faVerify, type TwoFALoginVerifyRequest } from "@/api/auth";
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
    } catch {
        return null;
    }
}

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    two_factor_enabled?: boolean | null;
    avatar_url?: string | null;
    theme?: string | null;
    timezone?: string | null;
    locale?: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    loginUser: (data: LoginForm) => Promise<void>;
    loginWith2FA: (twofaToken: string, code: string) => Promise<void>;
    registerUser: (data: RegisterForm) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    avatarVersion: number;
    bumpAvatarVersion: () => void;
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
    const [avatarVersion, setAvatarVersion] = useState<number>(0);
    const navigate = useNavigate();

    const loginUser = async (data: LoginForm) => {
        try {
            const tokenData = await login(data);

            if ((tokenData as LoginRequires2FA).requires_2fa) {
                const info = tokenData as LoginRequires2FA;
                const err = new Error("TwoFARequired") as Error & {
                    twofa_token: string;
                };
                err.twofa_token = info.twofa_token;
                throw err;
            }

            const pair = tokenData as {
                access_token: string;
                refresh_token?: string;
                token_type: string;
            };
            setAuthToken(pair.access_token);

            if (data.remember_me) {
                localStorage.setItem("access_token", pair.access_token);
                const decodedToken = decodeJwt(pair.access_token);
                if (decodedToken && decodedToken.session_id) {
                    setCurrentSessionId(decodedToken.session_id);
                }
            } else {
                sessionStorage.setItem("access_token", pair.access_token);
            }

            const profile = await getMe();
            setUser(profile);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const loginWith2FA = async (twofaToken: string, code: string) => {
        const payload: TwoFALoginVerifyRequest = {
            twofa_token: twofaToken,
            code,
        };
        const res = await login2faVerify(payload);
        const hasRefresh =
            "refresh_token" in res &&
            (res as { refresh_token?: string }).refresh_token !== "";

        const accessToken = (res as { access_token: string }).access_token;
        setAuthToken(accessToken);

        if (hasRefresh) {
            localStorage.setItem("access_token", accessToken);
            const decoded = decodeJwt(accessToken);
            if (decoded && decoded.session_id)
                setCurrentSessionId(decoded.session_id);
        } else {
            sessionStorage.setItem("access_token", accessToken);
        }

        const profile = await getMe();
        setUser(profile);
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

    const refreshProfile = async () => {
        try {
            const profile = await getMe();
            const prevAvatar = user?.avatar_url ?? null;
            const newAvatar = profile?.avatar_url ?? null;
            setUser(profile);
            if (prevAvatar !== newAvatar) {
                setAvatarVersion(Date.now());
            }
        } catch (error) {
            console.error("Failed to refresh profile:", error);
        }
    };

    const bumpAvatarVersion = () => setAvatarVersion((v) => v + 1);

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
                loginWith2FA,
                registerUser,
                logout,
                refreshProfile,
                avatarVersion,
                bumpAvatarVersion,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
