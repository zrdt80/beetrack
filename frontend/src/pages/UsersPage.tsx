import { useEffect, useState } from "react";
import { getAllUsers } from "@/api/users";
import type { User } from "@/api/users";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { CardDescription } from "../components/ui/card";

export default function UsersPage() {
    const [users, setUsers] = useState<User[] | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">(
        "all"
    );

    const filteredUsers = users
        ? users.filter((user) => {
              const matchesSearch =
                  user.username.toLowerCase().includes(search.toLowerCase()) ||
                  user.email.toLowerCase().includes(search.toLowerCase());
              const matchesRole =
                  roleFilter === "all" ? true : user.role === roleFilter;
              return matchesSearch && matchesRole;
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
                        <CardDescription className="flex flex-row gap-4 items-center w-auto m-0">
                            <input
                                type="text"
                                placeholder="Search by username or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-w-[320px] max-w-[480px] text-gray-800 placeholder-gray-400"
                            />
                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(
                                        e.target.value as
                                            | "all"
                                            | "admin"
                                            | "user"
                                    )
                                }
                                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-800"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
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
                                    className="flex items-center justify-between bg-muted rounded px-4 py-3"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {user.username}
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
                                            size="md"
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
