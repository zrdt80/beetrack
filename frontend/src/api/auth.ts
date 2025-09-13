import api from "./axios";
import type { User } from "./users";

export interface LoginForm {
    email: string;
    password: string;
    remember_me?: boolean;
}

export interface LoginRequires2FA {
    requires_2fa: true;
    twofa_token: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}

export interface UserSession {
    id: number;
    user_agent: string;
    ip_address: string;
    device_info: string;
    created_at: string;
    last_activity: string;
    expires_at: string;
    is_valid: boolean;
}

export const login = async (
    data: LoginForm
): Promise<Token | LoginRequires2FA> => {
    if (!data.remember_me) {
        const form = new URLSearchParams();
        form.append("username", data.email);
        form.append("password", data.password);
        const res = await api.post<Token | LoginRequires2FA>(
            "/users/login",
            form,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        const maybe2fa = res.data as Partial<LoginRequires2FA>;
        if (maybe2fa.requires_2fa && typeof maybe2fa.twofa_token === "string") {
            return maybe2fa as LoginRequires2FA;
        }
        return res.data as Token;
    }
    const res = await api.post<Token | LoginRequires2FA>(
        "/users/login-with-remember",
        {
            email: data.email,
            password: data.password,
            remember_me: data.remember_me,
        }
    );
    const maybe2fa = res.data as Partial<LoginRequires2FA>;
    if (maybe2fa.requires_2fa && typeof maybe2fa.twofa_token === "string") {
        return maybe2fa as LoginRequires2FA;
    }
    return res.data as Token;
};

export const refreshToken = async (): Promise<Token> => {
    const res = await api.post<Token>("/users/refresh-token");
    return res.data;
};

export const logout = async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/users/logout");
    return res.data;
};

export const getUserSessions = async (): Promise<UserSession[]> => {
    const res = await api.get<UserSession[]>("/users/sessions");
    return res.data;
};

export const getUserSessionsAdmin = async (
    userId: number
): Promise<UserSession[]> => {
    const res = await api.get<UserSession[]>(`/users/${userId}/sessions`);
    return res.data;
};

export interface TwoFALoginVerifyRequest {
    code: string;
    twofa_token: string;
}

export const login2faVerify = async (
    payload: TwoFALoginVerifyRequest
): Promise<Token> => {
    const res = await api.post<Token>("/users/login/2fa-verify", {
        code: payload.code,
        setup_token: payload.twofa_token,
    });
    return res.data;
};

export const revokeSession = async (
    sessionId: number
): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(
        `/users/sessions/${sessionId}`
    );
    return res.data;
};

export const revokeUserSessionAdmin = async (
    userId: number,
    sessionId: number
): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(
        `/users/${userId}/sessions/${sessionId}`
    );
    return res.data;
};

export const revokeAllSessions = async (
    keepCurrent: boolean = true
): Promise<{ message: string }> => {
    const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");
    let currentSessionId = null;

    if (token && keepCurrent) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            currentSessionId = payload.session_id;
        } catch (e) {
            console.error("Error decoding token:", e);
        }
    }

    const url = currentSessionId
        ? `/users/sessions?keep_current=${keepCurrent}&current_session_id=${currentSessionId}`
        : `/users/sessions?keep_current=${keepCurrent}`;

    const res = await api.delete<{ message: string }>(url);
    return res.data;
};

export const revokeAllUserSessionsAdmin = async (
    userId: number,
    keepCurrent: boolean = true
): Promise<{ message: string }> => {
    const url = `/users/${userId}/sessions?keep_current=${keepCurrent}`;
    const res = await api.delete<{ message: string }>(url);
    return res.data;
};

export interface RegisterForm {
    username: string;
    email: string;
    password: string;
}

export async function register(
    data: RegisterForm
): Promise<{ access_token: string }> {
    const payload = {
        username: data.username,
        email: data.email,
        password: data.password,
    };

    const res = await api.post<{ access_token: string }>(
        "/users/register",
        payload
    );

    return res.data;
}

export const getMe = async (): Promise<User | null> => {
    const res = await api.get<User | null>("/users/me");
    return res.data;
};
