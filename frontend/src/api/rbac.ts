import api from "./axios";

export interface Permission {
    id: number;
    name: string;
    description: string;
    category: string;
}

export interface PermissionCategory {
    category: string;
    permissions: Permission[];
}

export interface Role {
    id: number;
    name: string;
    description: string;
    permissions: Permission[];
}

export interface RoleCreate {
    name: string;
    description?: string;
    permissions: number[];
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    permissions?: number[];
}

export interface UserWithRoles {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    created_at: string;
    role_assignments: UserRoleAssignmentRead[];
    roles: Role[];
    permissions: string[];
}

export interface UserRoleAssignmentRead {
    user_id: number;
    role_id: number;
    assigned_at: string;
    assigned_by: number;
}

export interface RolePermissionMatrix {
    roles: Role[];
    permissions: Permission[];
    matrix: { [roleName: string]: { [permissionName: string]: boolean } };
}

export interface UserRoleStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    users_by_role: { [roleName: string]: number };
    active_assignments: number;
    expired_assignments: number;
}

export interface RBACOverview {
    permissions_count: number;
    roles_count: number;
    active_assignments_count: number;
    user_stats: UserRoleStats;
    recent_changes: Array<{
        id: number;
        action: string;
        details: string;
        timestamp: string;
        user_id: number;
        username: string;
    }>;
}

export const getPermissions = async (): Promise<Permission[]> => {
    const res = await api.get<Permission[]>("/admin/rbac/permissions");
    return res.data;
};

export const getPermissionCategories = async (): Promise<string[]> => {
    const res = await api.get<{ categories: string[] }>(
        "/admin/rbac/permissions/categories"
    );
    return res.data.categories;
};

export const getRoles = async (): Promise<Role[]> => {
    const res = await api.get<Role[]>("/admin/rbac/roles");
    return res.data;
};

export const getRole = async (roleId: number): Promise<Role> => {
    const res = await api.get<Role>(`/admin/rbac/roles/${roleId}`);
    return res.data;
};

export const createRole = async (roleData: RoleCreate): Promise<Role> => {
    const res = await api.post<Role>("/admin/rbac/roles", roleData);
    return res.data;
};

export const updateRole = async (
    roleId: number,
    roleData: RoleUpdate
): Promise<Role> => {
    const res = await api.put<Role>(`/admin/rbac/roles/${roleId}`, roleData);
    return res.data;
};

export const deleteRole = async (roleId: number): Promise<void> => {
    await api.delete(`/admin/rbac/roles/${roleId}`);
};

export const getUsersWithRoles = async (): Promise<UserWithRoles[]> => {
    const res = await api.get<UserWithRoles[]>("/admin/rbac/users");
    return res.data;
};

export const assignUserRole = async (
    userId: number,
    roleId: number
): Promise<UserRoleAssignmentRead> => {
    const res = await api.post<UserRoleAssignmentRead>(
        `/admin/rbac/users/${userId}/roles/${roleId}`
    );
    return res.data;
};

export const removeUserRole = async (
    userId: number,
    roleId: number
): Promise<void> => {
    await api.delete(`/admin/rbac/users/${userId}/roles/${roleId}`);
};

export const getRBACOverview = async (): Promise<RBACOverview> => {
    const res = await api.get<RBACOverview>("/admin/rbac/overview");
    return res.data;
};

export const getRolePermissionMatrix =
    async (): Promise<RolePermissionMatrix> => {
        const res = await api.get<RolePermissionMatrix>("/admin/rbac/matrix");
        return res.data;
    };
