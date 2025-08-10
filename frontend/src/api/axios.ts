import axios, { AxiosError } from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest: any = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (!isRefreshing) {
                isRefreshing = true;
                originalRequest._retry = true;

                try {
                    const response = await axios.post<{ access_token: string }>(
                        `${api.defaults.baseURL}/users/refresh-token`,
                        {},
                        {
                            withCredentials: true,
                        }
                    );

                    const { access_token } = response.data;

                    setAuthToken(access_token);
                    localStorage.setItem("access_token", access_token);

                    onRefreshed(access_token);
                    isRefreshing = false;

                    originalRequest.headers[
                        "Authorization"
                    ] = `Bearer ${access_token}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    isRefreshing = false;

                    localStorage.removeItem("access_token");
                    sessionStorage.removeItem("access_token");
                    setAuthToken(null);

                    refreshSubscribers = [];

                    window.location.href = "/login";

                    return Promise.reject(refreshError);
                }
            } else {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token: string) => {
                        originalRequest.headers[
                            "Authorization"
                        ] = `Bearer ${token}`;
                        resolve(axios(originalRequest));
                    });
                });
            }
        }

        return Promise.reject(error);
    }
);

export default api;
