import { useEffect, useState } from "react";
import {
    getRolePermissionMatrix,
    getPermissionCategories,
    type RolePermissionMatrix,
} from "@/api/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Grid, Key, RefreshCw, Check, X, Filter } from "lucide-react";

export default function PermissionMatrix() {
    const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [matrixData, categoriesData] = await Promise.all([
                getRolePermissionMatrix(),
                getPermissionCategories(),
            ]);
            setMatrix(matrixData);
            setCategories(categoriesData);
        } catch (error) {
            toast.error("Failed to load permission matrix");
            console.error("Error loading permission matrix:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!matrix) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-gray-500">
                        Failed to load permission matrix
                    </p>
                    <Button onClick={loadData} className="mt-4">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const filteredPermissions =
        selectedCategory === "all"
            ? matrix.permissions
            : matrix.permissions.filter((p) => p.category === selectedCategory);

    const permissionsByCategory = filteredPermissions.reduce(
        (acc, permission) => {
            if (!acc[permission.category]) {
                acc[permission.category] = [];
            }
            acc[permission.category].push(permission);
            return acc;
        },
        {} as Record<string, typeof matrix.permissions>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Grid className="w-5 h-5" />
                    Permission Matrix
                </h3>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category} (
                                    {matrix?.permissions.filter(
                                        (p) => p.category === category
                                    ).length || 0}
                                    )
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-sm">Has Permission</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                                <X className="w-3 h-3 text-red-600" />
                            </div>
                            <span className="text-sm">No Permission</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Roles vs Permissions
                        {selectedCategory !== "all" && (
                            <Badge variant="outline" className="ml-2">
                                <Filter className="w-3 h-3 mr-1" />
                                {selectedCategory}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        {Object.entries(permissionsByCategory).map(
                            ([category, permissions]) => (
                                <div key={category} className="mb-8">
                                    <h4 className="text-lg font-semibold mb-4 capitalize flex items-center gap-2">
                                        {category}
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {permissions.length} permissions
                                        </Badge>
                                    </h4>

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left p-3 font-medium text-sm border-r">
                                                        Permission
                                                    </th>
                                                    {matrix.roles.map(
                                                        (role) => (
                                                            <th
                                                                key={role.id}
                                                                className="text-center p-3 font-medium text-sm border-r min-w-24"
                                                            >
                                                                <Badge
                                                                    variant={
                                                                        role.name ===
                                                                        "admin"
                                                                            ? "destructive"
                                                                            : role.name ===
                                                                              "worker"
                                                                            ? "default"
                                                                            : "secondary"
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {role.name}
                                                                </Badge>
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {permissions.map(
                                                    (permission, index) => (
                                                        <tr
                                                            key={permission.id}
                                                            className={
                                                                index % 2 === 0
                                                                    ? "bg-white"
                                                                    : "bg-gray-50"
                                                            }
                                                        >
                                                            <td className="p-3 border-r">
                                                                <div>
                                                                    <p className="font-medium text-sm">
                                                                        {
                                                                            permission.name
                                                                        }
                                                                    </p>
                                                                    {permission.description && (
                                                                        <p className="text-xs text-gray-600 mt-1">
                                                                            {
                                                                                permission.description
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {matrix.roles.map(
                                                                (role) => {
                                                                    const hasPermission =
                                                                        matrix
                                                                            .matrix[
                                                                            role
                                                                                .name
                                                                        ]?.[
                                                                            permission
                                                                                .name
                                                                        ] ||
                                                                        false;
                                                                    return (
                                                                        <td
                                                                            key={
                                                                                role.id
                                                                            }
                                                                            className="p-3 text-center border-r"
                                                                        >
                                                                            <div
                                                                                className={`
                                                                    inline-flex items-center justify-center w-6 h-6 rounded
                                                                    ${
                                                                        hasPermission
                                                                            ? "bg-green-100 border border-green-300"
                                                                            : "bg-red-100 border border-red-300"
                                                                    }
                                                                `}
                                                                            >
                                                                                {hasPermission ? (
                                                                                    <Check className="w-4 h-4 text-green-600" />
                                                                                ) : (
                                                                                    <X className="w-4 h-4 text-red-600" />
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                }
                                                            )}
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {matrix.roles.length}
                            </p>
                            <p className="text-sm text-gray-600">Total Roles</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {filteredPermissions.length}
                            </p>
                            <p className="text-sm text-gray-600">
                                {selectedCategory === "all"
                                    ? "Total"
                                    : "Filtered"}{" "}
                                Permissions
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">
                                {Object.keys(permissionsByCategory).length}
                            </p>
                            <p className="text-sm text-gray-600">
                                {selectedCategory === "all"
                                    ? "Total"
                                    : "Filtered"}{" "}
                                Categories
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                                {matrix.roles.reduce(
                                    (total, role) =>
                                        total +
                                        filteredPermissions.filter(
                                            (p) =>
                                                matrix.matrix[role.name]?.[
                                                    p.name
                                                ]
                                        ).length,
                                    0
                                )}
                            </p>
                            <p className="text-sm text-gray-600">
                                Total Assignments
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
