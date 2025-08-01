import api from "./axios";

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

export const getUser = async (userId: number): Promise<User> => {
    const res = await api.get(`/users/${userId}/`);
    return res.data;
};

export const updateMe = async (userData: Partial<User>): Promise<User> => {
    const res = await api.put("/users/me/", userData);
    return res.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await api.get("/users/");
    return res.data;
};
