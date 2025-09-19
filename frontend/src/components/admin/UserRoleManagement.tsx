import { useEffect, useState } from "react";
import {
    getUsersWithRoles,
    assignUserRole,
    removeUserRole,
    getRoles,
    type UserWithRoles,
    type Role,
} from "@/api/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Search, UserPlus, UserMinus, RefreshCw, Users } from "lucide-react";

interface UserRoleManagementProps {
    onRefresh: () => void;
}

export default function UserRoleManagement({
    onRefresh,
}: UserRoleManagementProps) {
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [activeFilter, setActiveFilter] = useState<string>("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, rolesData] = await Promise.all([
                getUsersWithRoles(),
                getRoles(),
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            toast.error("Failed to load user role data");
            console.error("Error loading user role data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRole = async (userId: number, roleId: number) => {
        try {
            await assignUserRole(userId, roleId);
            toast.success("Role assigned successfully");
            await loadData();
            onRefresh();
        } catch (error) {
            toast.error("Failed to assign role");
            console.error("Error assigning role:", error);
        }
    };

    const handleRemoveRole = async (userId: number, roleId: number) => {
        try {
            await removeUserRole(userId, roleId);
            toast.success("Role removed successfully");
            await loadData();
            onRefresh();
        } catch (error) {
            toast.error("Failed to remove role");
            console.error("Error removing role:", error);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole =
            roleFilter === "all" ||
            user.roles.some((role) => role.name === roleFilter);

        const matchesActive =
            activeFilter === "all" ||
            (activeFilter === "active" && user.is_active) ||
            (activeFilter === "inactive" && !user.is_active);

        return matchesSearch && matchesRole && matchesActive;
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Role Management
                </h3>
                <Button
                    onClick={loadData}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search users by username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center">
                            <p className="text-gray-500">
                                No users found matching the current filters
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredUsers.map((user) => (
                        <UserRoleCard
                            key={user.id}
                            user={user}
                            roles={roles}
                            onAssignRole={handleAssignRole}
                            onRemoveRole={handleRemoveRole}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface UserRoleCardProps {
    user: UserWithRoles;
    roles: Role[];
    onAssignRole: (userId: number, roleId: number) => void;
    onRemoveRole: (userId: number, roleId: number) => void;
}

function UserRoleCard({
    user,
    roles,
    onAssignRole,
    onRemoveRole,
}: UserRoleCardProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    const availableRoles = roles.filter(
        (role) => !user.roles.some((userRole) => userRole.id === role.id)
    );

    const handleAssignRole = () => {
        if (selectedRoleId) {
            onAssignRole(user.id, parseInt(selectedRoleId));
            setSelectedRoleId("");
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h4 className="font-semibold flex items-center gap-2">
                                {user.username}
                                {!user.is_active && (
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        Inactive
                                    </Badge>
                                )}
                            </h4>
                            <p className="text-sm text-gray-600">
                                {user.email}
                            </p>
                            <p className="text-xs text-gray-500">
                                Created:{" "}
                                {new Date(user.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                            {user.roles.length === 0 ? (
                                <Badge variant="outline">
                                    No roles assigned
                                </Badge>
                            ) : (
                                user.roles.map((role) => (
                                    <div
                                        key={role.id}
                                        className="flex items-center gap-1"
                                    >
                                        <Badge
                                            variant={
                                                role.name === "admin"
                                                    ? "destructive"
                                                    : role.name === "worker"
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {role.name}
                                        </Badge>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-900 bg-gray-100"
                                                >
                                                    <UserMinus className="w-3 h-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>
                                                        Remove Role
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to
                                                        remove the "{role.name}"
                                                        role from{" "}
                                                        {user.username}? This
                                                        action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() =>
                                                            onRemoveRole(
                                                                user.id,
                                                                role.id
                                                            )
                                                        }
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Remove Role
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))
                            )}
                        </div>

                        {availableRoles.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Select
                                    value={selectedRoleId}
                                    onValueChange={setSelectedRoleId}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Add role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableRoles.map((role) => (
                                            <SelectItem
                                                key={role.id}
                                                value={role.id.toString()}
                                            >
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleAssignRole}
                                    disabled={!selectedRoleId}
                                    size="sm"
                                    className="flex items-center gap-1"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Assign
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
