import api from "./axios";
import type { Hive, HiveCreate, HivePage } from "./hives";

export interface Apiary {
    id: number;
    name: string;
    location?: string | null;
    description?: string | null;
    owner_id: number;
    created_at: string;
}

export interface PageMeta {
    page: number;
    size: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface ApiaryPage {
    meta: PageMeta;
    items: Apiary[];
}

export interface ApiaryCreate {
    name: string;
    location?: string | null;
    description?: string | null;
}

export type ApiaryRole = "owner" | "manager" | "worker";

export interface ApiaryMemberRead {
    id: number;
    apiary_id: number;
    user_id: number;
    role: ApiaryRole;
    joined_at: string;
    is_active: boolean;
}

export interface ApiaryMemberPage {
    meta: PageMeta;
    items: ApiaryMemberRead[];
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "canceled";

export interface ApiaryInviteCreate {
    email: string;
    role: ApiaryRole;
}

export interface ApiaryInvitationRead {
    id: number;
    apiary_id: number;
    inviter_id: number;
    invitee_email: string;
    role: ApiaryRole;
    status: InvitationStatus;
    token: string;
    created_at: string;
    decided_at?: string | null;
}

export interface ApiaryInvitationPage {
    meta: PageMeta;
    items: ApiaryInvitationRead[];
}

export interface ApiaryTransferOwnershipRequest {
    new_owner_user_id: number;
}

export const getApiaries = async (
    page: number = 1,
    size: number = 20,
    q?: string
): Promise<ApiaryPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (q && q.trim()) params.set("q", q.trim());
    const res = await api.get<ApiaryPage>(`/apiaries?${params.toString()}`);
    return res.data;
};

export const getApiary = async (id: number): Promise<Apiary> => {
    const res = await api.get<Apiary>(`/apiaries/${id}`);
    return res.data;
};

export const getApiaryHives = async (
    apiaryId: number,
    page: number = 1,
    size: number = 20
): Promise<HivePage> => {
    const res = await api.get<HivePage>(
        `/apiaries/${apiaryId}/hives?page=${page}&size=${size}`
    );
    return res.data;
};

export const createApiary = async (data: ApiaryCreate): Promise<Apiary> => {
    const res = await api.post<Apiary>(`/apiaries/`, data);
    return res.data;
};

export const deleteApiary = async (id: number): Promise<void> => {
    await api.delete(`/apiaries/${id}`);
};

export const createHiveInApiary = async (
    apiaryId: number,
    data: HiveCreate
): Promise<Hive> => {
    const res = await api.post<Hive>(`/apiaries/${apiaryId}/hives`, data);
    return res.data;
};

export const listApiaryMembers = async (
    apiaryId: number,
    page: number = 1,
    size: number = 20,
    q?: string,
    includeInactive: boolean = false
): Promise<ApiaryMemberPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        include_inactive: String(includeInactive),
    });
    if (q && q.trim()) params.set("q", q.trim());
    const res = await api.get<ApiaryMemberPage>(
        `/apiaries/${apiaryId}/members?${params.toString()}`
    );
    return res.data;
};

export const updateApiaryMemberRole = async (
    apiaryId: number,
    userId: number,
    role: ApiaryRole
): Promise<ApiaryMemberRead> => {
    const res = await api.patch<ApiaryMemberRead>(
        `/apiaries/${apiaryId}/members/${userId}`,
        { role }
    );
    return res.data;
};

export const removeApiaryMember = async (
    apiaryId: number,
    userId: number
): Promise<void> => {
    await api.delete(`/apiaries/${apiaryId}/members/${userId}`);
};

export const listApiaryInvitations = async (
    apiaryId: number,
    page: number = 1,
    size: number = 20,
    q?: string
): Promise<ApiaryInvitationPage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (q && q.trim()) params.set("q", q.trim());
    const res = await api.get<ApiaryInvitationPage>(
        `/apiaries/${apiaryId}/invitations?${params.toString()}`
    );
    return res.data;
};

export const createApiaryInvitation = async (
    apiaryId: number,
    data: ApiaryInviteCreate
): Promise<ApiaryInvitationRead> => {
    const res = await api.post<ApiaryInvitationRead>(
        `/apiaries/${apiaryId}/invitations`,
        data
    );
    return res.data;
};

export const cancelApiaryInvitation = async (
    apiaryId: number,
    invitationId: number
): Promise<void> => {
    await api.post(`/apiaries/${apiaryId}/invitations/${invitationId}/cancel`);
};

export const acceptApiaryInvitation = async (
    token: string
): Promise<ApiaryMemberRead> => {
    const res = await api.post<ApiaryMemberRead>(
        `/apiaries/invitations/accept/${token}`
    );
    return res.data;
};

export const declineApiaryInvitation = async (token: string): Promise<void> => {
    await api.post(`/apiaries/invitations/decline/${token}`);
};

export const transferApiaryOwnership = async (
    apiaryId: number,
    data: ApiaryTransferOwnershipRequest
): Promise<Apiary> => {
    const res = await api.post<Apiary>(
        `/apiaries/${apiaryId}/transfer-ownership`,
        data
    );
    return res.data;
};
