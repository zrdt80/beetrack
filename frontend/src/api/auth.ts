import api from "./axios";

export interface LoginForm {
    username: string;
    password: string;
}

export const login = async (data: LoginForm) => {
    const form = new URLSearchParams();
    form.append("username", data.username);
    form.append("password", data.password);

    const res = await api.post("/users/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return res.data; // zawiera access_token
};

export const getMe = async () => {
    const res = await api.get("/users/me");
    return res.data;
};
