import api from "./axios";
import { setAuthToken } from "./axios";
import { getMe } from "@/api/auth";

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

export interface UpdateUserPayload {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
}

export const getUser = async (userId: number): Promise<User> => {
    const res = await api.get(`/users/${userId}/`);
    return res.data;
};

export const updateMe = async (userData: Partial<User>): Promise<User> => {
    const res = await api.put("/users/me", userData);
    setAuthToken(res.data.access_token);
    localStorage.setItem("token", res.data.access_token);
    const profile = await getMe();
    return profile;
};

export const updateUser = async (
    userId: number,
    userData: Partial<User>
): Promise<User> => {
    const res = await api.put(`/users/${userId}`, userData);
    return res.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await api.get("/users/");
    return res.data;
};
