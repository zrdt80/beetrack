import axios, { AxiosError, type AxiosRequestConfig } from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const tokenRefreshEventTarget = new EventTarget();

export const addTokenRefreshListener = (callback: (token: string) => void) => {
    const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ token: string }>;
        callback(customEvent.detail.token);
    };
    tokenRefreshEventTarget.addEventListener("tokenRefreshed", handler);
    return () =>
        tokenRefreshEventTarget.removeEventListener("tokenRefreshed", handler);
};

const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];

    tokenRefreshEventTarget.dispatchEvent(
        new CustomEvent("tokenRefreshed", { detail: { token } })
    );
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
        const originalRequest = error.config as AxiosRequestConfig & {
            _retry?: boolean;
        };

        if (
            error.response?.status === 401 &&
            error.response?.headers["x-session-revoked"] === "true"
        ) {
            console.log("Session revoked detected in interceptor");
            console.log("Headers:", error.response?.headers);

            localStorage.removeItem("access_token");
            sessionStorage.removeItem("access_token");
            setAuthToken(null);

            const loginPageUrl = new URL("/login", window.location.origin);
            loginPageUrl.searchParams.append("reason", "session_revoked");
            console.log("Redirecting to:", loginPageUrl.toString());

            window.location.href = loginPageUrl.toString();
            return Promise.reject(error);
        }

        const isLoginAttempt =
            originalRequest?.url?.includes("/users/login") ||
            originalRequest?.url?.includes("/users/login-with-remember");

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isLoginAttempt
        ) {
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

                    if (sessionStorage.getItem("access_token")) {
                        sessionStorage.setItem("access_token", access_token);
                    } else {
                        localStorage.setItem("access_token", access_token);
                    }

                    onRefreshed(access_token);
                    isRefreshing = false;

                    if (originalRequest.headers) {
                        originalRequest.headers[
                            "Authorization"
                        ] = `Bearer ${access_token}`;
                    }
                    return axios(originalRequest);
                } catch (refreshError) {
                    isRefreshing = false;

                    localStorage.removeItem("access_token");
                    sessionStorage.removeItem("access_token");
                    setAuthToken(null);

                    refreshSubscribers = [];

                    if (!isLoginAttempt) {
                        window.location.href = "/login";
                    }

                    return Promise.reject(refreshError);
                }
            } else {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token: string) => {
                        if (originalRequest.headers) {
                            originalRequest.headers[
                                "Authorization"
                            ] = `Bearer ${token}`;
                        }
                        resolve(axios(originalRequest));
                    });
                });
            }
        }

        return Promise.reject(error);
    }
);

export default api;
