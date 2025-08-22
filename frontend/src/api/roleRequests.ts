import api from "./axios";

export interface RoleRequest {
    id: number;
    user_id: number;
    from_role: string;
    to_role: string;
    status: string;
    reason?: string;
    admin_comment?: string;
    decided_by?: number | null;
    created_at: string;
    decided_at?: string | null;
}

export interface RoleRequestCreatePayload {
    to_role: string;
    reason?: string;
}

export interface RoleRequestDecisionPayload {
    approve: boolean;
    admin_comment?: string;
}

export interface RoleRequestCancelPayload {
    reason?: string;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}
export interface RoleRequestPage {
    meta: PageMeta;
    items: RoleRequest[];
}

export const createRoleRequest = async (
    payload: RoleRequestCreatePayload
): Promise<RoleRequest> => {
    const res = await api.post<RoleRequest>("/role-requests/", payload);
    return res.data;
};

export const listMyRoleRequests = async (): Promise<RoleRequest[]> => {
    const res = await api.get<RoleRequest[]>("/role-requests/me");
    return res.data;
};

export const listMyRoleRequestsPage = async (
    page = 1,
    size = 25,
    order: string = "-created_at"
): Promise<RoleRequestPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        order,
    });
    const res = await api.get<RoleRequestPage>(
        `/role-requests/me/page?${params.toString()}`
    );
    return res.data;
};

export interface RoleRequestFilters {
    status?: string;
    statuses?: string[];
    user_id?: number;
    username?: string;
    from_role?: string;
    to_role?: string;
    created_from?: string;
    created_to?: string;
    decided?: boolean;
    order?: string;
}

export const listRoleRequests = async (
    page = 1,
    size = 25,
    filters: RoleRequestFilters = {}
): Promise<RoleRequestPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (filters.status) params.append("status", filters.status);
    if (filters.statuses)
        filters.statuses.forEach((s) => params.append("statuses", s));
    if (filters.user_id) params.append("user_id", String(filters.user_id));
    if (filters.username) params.append("username", filters.username);
    if (filters.from_role) params.append("from_role", filters.from_role);
    if (filters.to_role) params.append("to_role", filters.to_role);
    if (filters.created_from)
        params.append("created_from", filters.created_from);
    if (filters.created_to) params.append("created_to", filters.created_to);
    if (filters.decided !== undefined)
        params.append("decided", String(filters.decided));
    if (filters.order) params.append("order", filters.order);
    const res = await api.get<RoleRequestPage>(
        `/role-requests/?${params.toString()}`
    );
    return res.data;
};

export const decideRoleRequest = async (
    id: number,
    payload: RoleRequestDecisionPayload
): Promise<RoleRequest> => {
    const res = await api.post<RoleRequest>(
        `/role-requests/${id}/decision`,
        payload
    );
    return res.data;
};

export const cancelRoleRequest = async (
    id: number,
    payload?: RoleRequestCancelPayload
): Promise<RoleRequest> => {
    const res = await api.post<RoleRequest>(
        `/role-requests/${id}/cancel`,
        payload || {}
    );
    return res.data;
};

export const getRejectionTemplates = async (): Promise<string[]> => {
    const res = await api.get<string[]>("/role-requests/templates/rejections");
    return res.data;
};

export interface RoleRequestSummary {
    total: number;
    pending: number;
    last_status?: string | null;
    last_created_at?: string | null;
    last_decided_at?: string | null;
}
export const getMyRoleRequestSummary =
    async (): Promise<RoleRequestSummary> => {
        const res = await api.get<RoleRequestSummary>(
            "/role-requests/me/summary"
        );
        return res.data;
    };

export interface RoleRequestDailyEntry {
    date: string;
    pending: number;
    approved: number;
    rejected: number;
    canceled: number;
}
export const getDailyStats = async (
    days = 14
): Promise<RoleRequestDailyEntry[]> => {
    const res = await api.get<RoleRequestDailyEntry[]>(
        `/role-requests/stats/daily?days=${days}`
    );
    return res.data;
};

export const getAdminSummary = async (): Promise<Record<string, number>> => {
    const res = await api.get<Record<string, number>>(
        "/role-requests/stats/summary"
    );
    return res.data;
};

export interface RoleRequestNotification {
    id: number;
    status: string;
    decided_at: string;
    admin_comment?: string;
    to_role: string;
}

export const getMyRoleRequestNotifications = async (
    sinceMinutes = 1440
): Promise<RoleRequestNotification[]> => {
    const res = await api.get<RoleRequestNotification[]>(
        `/role-requests/me/notifications?since_minutes=${sinceMinutes}`
    );
    return res.data;
};
