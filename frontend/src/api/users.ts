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
}

export interface UpdateUserPayload {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    is_active?: boolean;
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
