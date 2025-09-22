import { useEffect, useState } from "react";
import { getRBACOverview, type RBACOverview } from "@/api/rbac";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Users, Key, Lock, Settings, Eye, History } from "lucide-react";
import UserRoleManagement from "./UserRoleManagement";
import RoleManagement from "./RoleManagement";
import PermissionMatrix from "./PermissionMatrix";
import RBACSystemOverview from "./RBACSystemOverview";
import RBACChangesTable from "./RBACChangesTable";

export default function RBACAdminPanel() {
    const [overview, setOverview] = useState<RBACOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        loadOverview();
    }, []);

    const loadOverview = async () => {
        try {
            setLoading(true);
            const data = await getRBACOverview();
            setOverview(data);
        } catch (error) {
            toast.error("Failed to load RBAC overview");
            console.error("Error loading RBAC overview:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full p-4">
                <Card className="w-full max-w-6xl shadow-lg border-0 p-8">
                    <CardHeader>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-full p-4">
            <Card className="w-full max-w-6xl shadow-lg border-0 p-8">
                <CardHeader className="pb-8">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-col gap-3">
                            <CardTitle className="text-3xl font-bold flex items-center gap-3">
                                <Shield className="w-8 h-8 text-blue-600" />
                                RBAC Administration
                            </CardTitle>
                            <CardDescription className="text-base">
                                Comprehensive role-based access control
                                management system
                            </CardDescription>
                        </div>
                        <Button
                            onClick={loadOverview}
                            variant="outline"
                            size="default"
                            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                        >
                            <Settings className="w-4 h-4" />
                            Refresh Data
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {overview && (
                        <div className="mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-green-600 mb-1">
                                                    Permissions
                                                </p>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    {overview.permissions_count}
                                                </p>
                                            </div>
                                            <Key className="w-10 h-10 text-green-500 opacity-80" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-blue-600 mb-1">
                                                    Roles
                                                </p>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    {overview.roles_count}
                                                </p>
                                            </div>
                                            <Lock className="w-10 h-10 text-blue-500 opacity-80" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-purple-600 mb-1">
                                                    Total Users
                                                </p>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    {
                                                        overview.user_stats
                                                            .total_users
                                                    }
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {
                                                        overview.user_stats
                                                            .active_users
                                                    }{" "}
                                                    active
                                                </p>
                                            </div>
                                            <Users className="w-10 h-10 text-purple-500 opacity-80" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-orange-600 mb-1">
                                                    Active Assignments
                                                </p>
                                                <p className="text-3xl font-bold text-gray-900">
                                                    {
                                                        overview.active_assignments_count
                                                    }
                                                </p>
                                            </div>
                                            <Eye className="w-10 h-10 text-orange-500 opacity-80" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-5 gap-6 h-12 bg-gray-50 border border-gray-200 p-1 rounded-lg">
                            <TabsTrigger
                                value="overview"
                                className="flex items-center gap-2 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Eye className="w-4 h-4" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="users"
                                className="flex items-center gap-2 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Users className="w-4 h-4" />
                                User Roles
                            </TabsTrigger>
                            <TabsTrigger
                                value="roles"
                                className="flex items-center gap-2 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Lock className="w-4 h-4" />
                                Roles
                            </TabsTrigger>
                            <TabsTrigger
                                value="matrix"
                                className="flex items-center gap-2 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Key className="w-4 h-4" />
                                Permissions
                            </TabsTrigger>
                            <TabsTrigger
                                value="changes"
                                className="flex items-center gap-2 bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <History className="w-4 h-4" />
                                Changes
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-8">
                            <TabsContent value="overview" className="mt-0">
                                <RBACSystemOverview
                                    overview={overview}
                                    onRefresh={loadOverview}
                                />
                            </TabsContent>

                            <TabsContent value="users" className="mt-0">
                                <UserRoleManagement onRefresh={loadOverview} />
                            </TabsContent>

                            <TabsContent value="roles" className="mt-0">
                                <RoleManagement onRefresh={loadOverview} />
                            </TabsContent>

                            <TabsContent value="matrix" className="mt-0">
                                <PermissionMatrix />
                            </TabsContent>

                            <TabsContent value="changes" className="mt-0">
                                <RBACChangesTable />
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
