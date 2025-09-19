import { useEffect, useState } from "react";
import {
    getRoles,
    getPermissions,
    createRole,
    updateRole,
    deleteRole,
    type Role,
    type Permission,
    type RoleCreate,
    type RoleUpdate,
} from "@/api/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, RefreshCw, Key } from "lucide-react";

interface RoleManagementProps {
    onRefresh: () => void;
}

export default function RoleManagement({ onRefresh }: RoleManagementProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [rolesData, permissionsData] = await Promise.all([
                getRoles(),
                getPermissions(),
            ]);
            setRoles(rolesData);
            setPermissions(permissionsData);
        } catch (error) {
            toast.error("Failed to load role data");
            console.error("Error loading role data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (roleData: RoleFormData) => {
        try {
            const createData: RoleCreate = {
                name: roleData.name,
                description: roleData.description,
                permissions: roleData.permissions,
            };
            await createRole(createData);
            toast.success("Role created successfully");
            setIsCreateDialogOpen(false);
            await loadData();
            onRefresh();
        } catch (error) {
            toast.error("Failed to create role");
            console.error("Error creating role:", error);
        }
    };

    const handleUpdateRole = async (roleId: number, roleData: RoleFormData) => {
        try {
            const updateData: RoleUpdate = {
                name: roleData.name,
                description: roleData.description,
                permissions: roleData.permissions,
            };
            await updateRole(roleId, updateData);
            toast.success("Role updated successfully");
            setEditingRole(null);
            await loadData();
            onRefresh();
        } catch (error) {
            toast.error("Failed to update role");
            console.error("Error updating role:", error);
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        try {
            await deleteRole(roleId);
            toast.success("Role deleted successfully");
            await loadData();
            onRefresh();
        } catch (error) {
            toast.error("Failed to delete role");
            console.error("Error deleting role:", error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Role Management
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={loadData}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Button>
                    <Dialog
                        open={isCreateDialogOpen}
                        onOpenChange={setIsCreateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <RoleForm
                                permissions={permissions}
                                onSubmit={handleCreateRole}
                                onCancel={() => setIsCreateDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4">
                {roles.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center">
                            <p className="text-gray-500">No roles found</p>
                        </CardContent>
                    </Card>
                ) : (
                    roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            permissions={permissions}
                            onEdit={setEditingRole}
                            onDelete={handleDeleteRole}
                        />
                    ))
                )}
            </div>

            {editingRole && (
                <Dialog
                    open={!!editingRole}
                    onOpenChange={() => setEditingRole(null)}
                >
                    <DialogContent className="max-w-2xl">
                        <RoleForm
                            permissions={permissions}
                            initialRole={editingRole}
                            onSubmit={(roleData) =>
                                handleUpdateRole(editingRole.id, roleData)
                            }
                            onCancel={() => setEditingRole(null)}
                            isEdit
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

interface RoleCardProps {
    role: Role;
    permissions: Permission[];
    onEdit: (role: Role) => void;
    onDelete: (roleId: number) => void;
}

function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
    const permissionsByCategory = role.permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Badge
                                variant={
                                    role.name === "admin"
                                        ? "destructive"
                                        : role.name === "worker"
                                        ? "default"
                                        : "secondary"
                                }
                                className="text-sm"
                            >
                                {role.name}
                            </Badge>
                        </CardTitle>
                        {role.description && (
                            <p className="text-sm text-gray-600 mt-1">
                                {role.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => onEdit(role)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Delete Role
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete the "
                                        {role.name}" role? This action cannot be
                                        undone and will remove this role from
                                        all users.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => onDelete(role.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Delete Role
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">
                            {role.permissions.length} Permission
                            {role.permissions.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {Object.entries(permissionsByCategory).map(
                        ([category, perms]) => (
                            <div key={category} className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 capitalize">
                                    {category} ({perms.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {perms.map((permission) => (
                                        <Badge
                                            key={permission.id}
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {permission.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface RoleFormData {
    name: string;
    description?: string;
    permissions: number[];
}

interface RoleFormProps {
    permissions: Permission[];
    initialRole?: Role;
    onSubmit: (roleData: RoleFormData) => void;
    onCancel: () => void;
    isEdit?: boolean;
}

function RoleForm({
    permissions,
    initialRole,
    onSubmit,
    onCancel,
    isEdit = false,
}: RoleFormProps) {
    const [name, setName] = useState(initialRole?.name || "");
    const [description, setDescription] = useState(
        initialRole?.description || ""
    );
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>(
        initialRole?.permissions.map((p) => p.id) || []
    );

    const permissionsByCategory = permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Role name is required");
            return;
        }

        onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            permissions: selectedPermissions,
        });
    };

    const togglePermission = (permissionId: number) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const toggleCategory = (category: string) => {
        const categoryPermissions = permissionsByCategory[category];
        const categoryIds = categoryPermissions.map((p) => p.id);
        const allSelected = categoryIds.every((id) =>
            selectedPermissions.includes(id)
        );

        if (allSelected) {
            setSelectedPermissions((prev) =>
                prev.filter((id) => !categoryIds.includes(id))
            );
        } else {
            setSelectedPermissions((prev) => [
                ...new Set([...prev, ...categoryIds]),
            ]);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>
                    {isEdit ? "Edit Role" : "Create New Role"}
                </DialogTitle>
                <DialogDescription>
                    {isEdit
                        ? "Update the role details and permissions"
                        : "Define a new role with specific permissions"}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">
                            Role Name *
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter role name..."
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter role description..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Permissions
                        </label>
                        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
                            {Object.entries(permissionsByCategory).map(
                                ([category, perms]) => {
                                    const categoryIds = perms.map((p) => p.id);
                                    const allSelected = categoryIds.every(
                                        (id) => selectedPermissions.includes(id)
                                    );
                                    const someSelected = categoryIds.some(
                                        (id) => selectedPermissions.includes(id)
                                    );

                                    return (
                                        <div
                                            key={category}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={(input) => {
                                                        if (input)
                                                            input.indeterminate =
                                                                someSelected &&
                                                                !allSelected;
                                                    }}
                                                    onChange={() =>
                                                        toggleCategory(category)
                                                    }
                                                    className="rounded"
                                                />
                                                <label className="font-medium capitalize text-sm">
                                                    {category} ({perms.length})
                                                </label>
                                            </div>
                                            <div className="ml-6 space-y-1">
                                                {perms.map((permission) => (
                                                    <div
                                                        key={permission.id}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.includes(
                                                                permission.id
                                                            )}
                                                            onChange={() =>
                                                                togglePermission(
                                                                    permission.id
                                                                )
                                                            }
                                                            className="rounded"
                                                        />
                                                        <label className="text-sm">
                                                            {permission.name}
                                                        </label>
                                                        {permission.description && (
                                                            <span className="text-xs text-gray-500">
                                                                -{" "}
                                                                {
                                                                    permission.description
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Selected: {selectedPermissions.length} of{" "}
                            {permissions.length} permissions
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        {isEdit ? "Update Role" : "Create Role"}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}
