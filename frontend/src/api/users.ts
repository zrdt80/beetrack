import api from "./axios";
import { setAuthToken } from "./axios";
import { getMe } from "@/api/auth";

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
    is_active: boolean;
    two_factor_enabled?: boolean | null;
}

export interface UpdateUserPayload {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    is_active?: boolean;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}
export interface UserPage {
    meta: PageMeta;
    items: User[];
}

export const getUser = async (userId: number): Promise<User> => {
    const res = await api.get<User>(`/users/${userId}/`);
    return res.data;
};

export const updateMe = async (
    userData: Partial<User>
): Promise<User | null> => {
    const res = await api.put<{ access_token: string; token_type: string }>(
        "/users/me",
        userData
    );
    setAuthToken(res.data.access_token);
    localStorage.setItem("token", res.data.access_token);
    const profile = await getMe();
    return profile;
};

export const updateUser = async (
    userId: number,
    userData: Partial<User>
): Promise<User> => {
    const res = await api.put<User>(`/users/${userId}`, userData);
    return res.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await api.get<User[]>("/users/");
    return res.data;
};

export const getUsersPage = async (
    page: number = 1,
    size: number = 25
): Promise<UserPage> => {
    const res = await api.get<UserPage>(`/users/?page=${page}&size=${size}`);
    return res.data;
};

export interface TwoFASetupStart {
    provisioning_uri: string;
    secret: string;
    setup_token: string;
}

export interface TwoFAVerifyResponse {
    recovery_codes: string[];
}

export const startTwoFASetup = async (): Promise<TwoFASetupStart> => {
    const res = await api.post<TwoFASetupStart>(`/users/2fa/setup/start`);
    return res.data;
};

export const verifyTwoFASetup = async (
    code: string,
    setup_token?: string
): Promise<TwoFAVerifyResponse> => {
    const res = await api.post<TwoFAVerifyResponse>(`/users/2fa/setup/verify`, {
        code,
        setup_token,
    });
    return res.data;
};

export const disableTwoFA = async (payload?: {
    password?: string;
    code?: string;
}): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(
        `/users/2fa/disable`,
        payload || {}
    );
    return res.data;
};

export const regenerateTwoFARecovery = async (): Promise<{
    recovery_codes: string[];
}> => {
    const res = await api.post<{ recovery_codes: string[] }>(
        `/users/2fa/recovery/regenerate`,
        {}
    );
    return res.data;
};
