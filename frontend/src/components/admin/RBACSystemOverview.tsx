import { type RBACOverview } from "@/api/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    RefreshCw,
    Users,
    UserCheck,
    UserX,
    Shield,
    History,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface RBACSystemOverviewProps {
    overview: RBACOverview | null;
    onRefresh: () => void;
}

export default function RBACSystemOverview({
    overview,
    onRefresh,
}: RBACSystemOverviewProps) {
    if (!overview) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-center text-gray-500">
                        No overview data available
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { user_stats } = overview;
    const active_users = user_stats.active_users;
    const inactive_users = user_stats.inactive_users;
    const activePercentage =
        user_stats.total_users > 0
            ? (active_users / user_stats.total_users) * 100
            : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">System Overview</h3>
                <Button
                    onClick={onRefresh}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            User Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium">
                                        Active Users
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-green-600">
                                    {active_users}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserX className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-medium">
                                        Inactive Users
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-red-600">
                                    {inactive_users}
                                </span>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">
                                        Active Rate
                                    </span>
                                    <span className="text-sm font-medium">
                                        {activePercentage.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                            width: `${activePercentage}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Role Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(user_stats.users_by_role).map(
                                ([roleName, count]) => {
                                    const percentage =
                                        user_stats.total_users > 0
                                            ? (count / user_stats.total_users) *
                                              100
                                            : 0;

                                    return (
                                        <div
                                            key={roleName}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            roleName === "admin"
                                                                ? "destructive"
                                                                : roleName ===
                                                                  "worker"
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {roleName}
                                                    </Badge>
                                                    <span className="text-sm font-medium">
                                                        {count} users
                                                    </span>
                                                </div>
                                                <span className="text-sm text-gray-600">
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full"
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-600" />
                            Role Assignments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    Active Assignments
                                </span>
                                <span className="text-lg font-bold text-purple-600">
                                    {overview.active_assignments_count}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    Expired Assignments
                                </span>
                                <span className="text-lg font-bold text-orange-600">
                                    {user_stats.expired_assignments}
                                </span>
                            </div>
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">
                                        Assignment Health
                                    </span>
                                    <span className="text-sm font-medium">
                                        {overview.active_assignments_count > 0
                                            ? (
                                                  ((overview.active_assignments_count -
                                                      user_stats.expired_assignments) /
                                                      overview.active_assignments_count) *
                                                  100
                                              ).toFixed(1)
                                            : 0}
                                        %
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${
                                                overview.active_assignments_count >
                                                0
                                                    ? ((overview.active_assignments_count -
                                                          user_stats.expired_assignments) /
                                                          overview.active_assignments_count) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-600" />
                            Recent Changes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {overview.recent_changes &&
                        overview.recent_changes.length > 0 ? (
                            <div className="space-y-3">
                                {overview.recent_changes
                                    .slice(0, 5)
                                    .map((e) => (
                                        <div
                                            key={e.id}
                                            className="flex items-start justify-between"
                                        >
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    {e.username}
                                                </span>{" "}
                                                <span className="text-gray-600">
                                                    {e.action}
                                                </span>
                                                {e.details ? (
                                                    <span className="text-gray-600">
                                                        {" "}
                                                        — {e.details}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(
                                                    e.timestamp
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    No recent RBAC changes
                                </p>
                                <StatusBadge
                                    status="placeholder"
                                    showIcon
                                    className="ml-2"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
