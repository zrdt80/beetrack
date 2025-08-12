import { useEffect, useState } from "react";
import { getAllUsers } from "@/api/users";
import type { User } from "@/api/users";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function UsersPage() {
    const [users, setUsers] = useState<User[] | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useDocumentTitle("User Management");

    const load = async () => {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<
        "all" | "admin" | "user" | "worker"
    >("all");
    const [activeFilter, setActiveFilter] = useState<
        "all" | "active" | "inactive"
    >("all");

    const filteredUsers = users
        ? users.filter((user) => {
              const matchesSearch =
                  user.username.toLowerCase().includes(search.toLowerCase()) ||
                  user.email.toLowerCase().includes(search.toLowerCase());
              const matchesRole =
                  roleFilter === "all" ? true : user.role === roleFilter;
              const matchesActive =
                  activeFilter === "all"
                      ? true
                      : activeFilter === "active"
                      ? user.is_active
                      : !user.is_active;
              return matchesSearch && matchesRole && matchesActive;
          })
        : [];

    return (
        <div className="flex justify-center items-center h-full p-4">
            <Card className="w-full max-w-2xl shadow-lg border-0 p-8">
                <CardHeader className="flex flex-col gap-2">
                    <div className="flex flex-row items-center justify-between w-full gap-4 flex-wrap">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2 m-0">
                            <span
                                role="img"
                                aria-label="users"
                                className="text-2xl"
                            >
                                👥
                            </span>
                            Users
                        </CardTitle>
                        <CardDescription className="flex flex-row gap-3 items-center w-full m-0 flex-wrap">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-800 placeholder-gray-400"
                            />
                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(
                                        e.target.value as
                                            | "all"
                                            | "admin"
                                            | "worker"
                                            | "user"
                                    )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-800"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="worker">Worker</option>
                                <option value="user">User</option>
                            </select>
                            <select
                                value={activeFilter}
                                onChange={(e) =>
                                    setActiveFilter(
                                        e.target.value as
                                            | "all"
                                            | "active"
                                            | "inactive"
                                    )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-800"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </CardDescription>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 max-h-[70vh] overflow-auto">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-12 w-full rounded"
                                />
                            ))}
                        </div>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                        <div className="space-y-4">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={`flex items-center justify-between rounded px-4 py-3 ${
                                        !user.is_active
                                            ? "bg-red-50 border border-red-200"
                                            : "bg-muted"
                                    }`}
                                >
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {user.username}
                                            {!user.is_active && (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-red-100 text-red-700 border-red-300 px-2 py-0.5 text-xs font-semibold rounded-full shadow-sm"
                                                >
                                                    <span className="mr-1.5 inline-block w-2 h-2 bg-red-500 rounded-full" />
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {user.email}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={
                                                user.role === "admin"
                                                    ? "destructive"
                                                    : "secondary"
                                            }
                                            className={
                                                user.role === "admin"
                                                    ? ""
                                                    : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                            }
                                        >
                                            {user.role.charAt(0).toUpperCase() +
                                                user.role.slice(1)}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                navigate(
                                                    `/dashboard/user/${user.id}`
                                                )
                                            }
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p>No users found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
