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
        role: "worker",
    };

    const res = await api.post("/users/register", payload);

    return res.data;
}

export const getMe = async () => {
    const res = await api.get("/users/me");
    return res.data;
};
