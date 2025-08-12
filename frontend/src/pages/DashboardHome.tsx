import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import StatusBadge from "@/components/StatusBadge";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
    Home,
    Activity,
    Package,
    BarChart3,
    Calendar,
    AlertTriangle,
    TrendingUp,
    Clock,
    FileText,
    Plus,
    ChevronRight,
    ShoppingCart,
    HelpCircle,
    Award,
} from "lucide-react";
import { getHives } from "@/api/hives";
import { getProducts } from "@/api/products";
import { getAllOrders, getOrders } from "@/api/orders";
import type { Hive } from "@/api/hives";
import type { Product } from "@/api/products";
import type { Order } from "@/api/orders";
import { formatDateTime } from "@/lib/datetime";

interface DashboardStats {
    totalHives: number;
    activeHives: number;
    totalProducts: number;
    lowStockProducts: number;
    totalOrders: number;
    pendingOrders: number;
    recentActivity: {
        type: "hive" | "order" | "product";
        title: string;
        subtitle: string;
        time: string;
        link?: string;
    }[];
}

const quickActions = [
    {
        title: "Add Hive",
        description: "Register a new beehive",
        icon: Plus,
        link: "/dashboard/hives",
        color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
        title: "Record Inspection",
        description: "Log hive inspection results",
        icon: Activity,
        link: "/dashboard/hives",
        color: "bg-green-50 text-green-600 border-green-200",
    },
    {
        title: "Manage Products",
        description: "Update honey inventory",
        icon: Package,
        link: "/dashboard/products",
        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
        title: "View Reports",
        description: "Generate and export data",
        icon: FileText,
        link: "/dashboard/export",
        color: "bg-purple-50 text-purple-600 border-purple-200",
    },
];

const userQuickActions = [
    {
        title: "View My Hives",
        description: "Check your assigned hives",
        icon: Home,
        link: "/dashboard/hives",
        color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
        title: "Record Inspection",
        description: "Log hive inspection results",
        icon: Activity,
        link: "/dashboard/hives",
        color: "bg-green-50 text-green-600 border-green-200",
    },
    {
        title: "Check Products",
        description: "View available products",
        icon: Package,
        link: "/dashboard/products",
        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
        title: "My Orders",
        description: "View your order history",
        icon: BarChart3,
        link: "/dashboard/orders",
        color: "bg-purple-50 text-purple-600 border-purple-200",
    },
];

const customerQuickActions = [
    {
        title: "Browse Products",
        description: "View available honey products",
        icon: Package,
        link: "/dashboard/products",
        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
        title: "Place Order",
        description: "Order honey products",
        icon: ShoppingCart,
        link: "/dashboard/orders",
        color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
        title: "My Orders",
        description: "View your order history",
        icon: BarChart3,
        link: "/dashboard/orders",
        color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
        title: "Help & Support",
        description: "Get assistance",
        icon: HelpCircle,
        link: "/dashboard/help",
        color: "bg-green-50 text-green-600 border-green-200",
    },
];

export default function DashboardHome() {
    const { user } = useAuth();

    useDocumentTitle("Dashboard");

    const [stats, setStats] = useState<DashboardStats>({
        totalHives: 0,
        activeHives: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        recentActivity: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [hives, products, orders] = await Promise.all([
                    getHives().catch(() => [] as Hive[]),
                    getProducts().catch(() => [] as Product[]),
                    user?.role === "admin"
                        ? getAllOrders().catch(() => [] as Order[])
                        : getOrders().catch(() => [] as Order[]),
                ]);

                const activeHives = hives.filter(
                    (h) => h.status === "active"
                ).length;
                const lowStockProducts = products.filter(
                    (p) => p.stock_quantity < 10
                ).length;
                const pendingOrders = orders.filter(
                    (o) => o.status === "pending"
                ).length;

                const recentActivity =
                    user?.role === "admin"
                        ? [
                              ...hives.slice(0, 2).map((hive) => ({
                                  type: "hive" as const,
                                  title: `Hive: ${hive.name}`,
                                  subtitle: `Location: ${hive.location}`,
                                  time: hive.last_inspection_date
                                      ? formatDateTime(
                                            hive.last_inspection_date,
                                            "date"
                                        )
                                      : "No inspections",
                                  link: `/dashboard/hives/${hive.id}`,
                              })),
                              ...orders.slice(0, 2).map((order) => ({
                                  type: "order" as const,
                                  title: `Order #${order.id}`,
                                  subtitle: `Status: ${order.status}`,
                                  time: formatDateTime(order.date, "date"),
                                  link: `/dashboard/orders`,
                              })),
                          ].slice(0, 4)
                        : user?.role === "worker"
                        ? [
                              ...hives.slice(0, 3).map((hive) => ({
                                  type: "hive" as const,
                                  title: `Hive: ${hive.name}`,
                                  subtitle: `Location: ${hive.location}`,
                                  time: hive.last_inspection_date
                                      ? formatDateTime(
                                            hive.last_inspection_date,
                                            "date"
                                        )
                                      : "No inspections",
                                  link: `/dashboard/hives/${hive.id}`,
                              })),
                              ...orders.slice(0, 3).map((order) => ({
                                  type: "order" as const,
                                  title: `Order #${order.id}`,
                                  subtitle: `Status: ${order.status}`,
                                  time: formatDateTime(order.date, "date"),
                                  link: `/dashboard/orders`,
                              })),
                          ].slice(0, 6)
                        : [
                              ...orders.slice(0, 6).map((order) => ({
                                  type: "order" as const,
                                  title: `Order #${order.id}`,
                                  subtitle: `Status: ${order.status}`,
                                  time: formatDateTime(order.date, "date"),
                                  link: `/dashboard/orders`,
                              })),
                          ].slice(0, 6);
                setStats({
                    totalHives: hives.length,
                    activeHives,
                    totalProducts: products.length,
                    lowStockProducts,
                    totalOrders: orders.length,
                    pendingOrders,
                    recentActivity,
                });
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-muted-foreground">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-green-50">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16 text-xl border-2 border-white shadow-md">
                                <AvatarFallback className="bg-blue-600 text-white">
                                    {user?.username?.[0]?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Welcome back, {user?.username}! 🐝
                                </h1>
                                <p className="text-muted-foreground">
                                    {user?.email} • Role:{" "}
                                    <Badge
                                        variant={
                                            user?.role === "admin"
                                                ? "destructive"
                                                : user?.role === "worker"
                                                ? "secondary"
                                                : "outline"
                                        }
                                    >
                                        {user?.role}
                                    </Badge>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                Today
                            </p>
                            <p className="text-lg font-semibold">
                                {new Date().toLocaleDateString()}
                            </p>
                            <TimezoneDisplay
                                showIcon={false}
                                className="text-xs mt-1"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {user?.role !== "user" && (
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Total Hives
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.totalHives}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.activeHives} active
                                    </p>
                                </div>
                                <Home className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {user?.role !== "user" ? (
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Products
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.totalProducts}
                                    </p>
                                    {stats.lowStockProducts > 0 && (
                                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {stats.lowStockProducts} low stock
                                        </p>
                                    )}
                                </div>
                                <Package className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Latest Promotions
                                            </p>
                                            <StatusBadge
                                                status="placeholder"
                                                showIcon={false}
                                                className="text-xs"
                                            />
                                        </div>
                                        <p className="text-2xl font-bold">
                                            Summer Sale
                                        </p>
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            Up to 15% off all honey products
                                        </p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Customer Rewards
                                            </p>
                                            <StatusBadge
                                                status="placeholder"
                                                showIcon={false}
                                                className="text-xs"
                                            />
                                        </div>
                                        <p className="text-2xl font-bold">
                                            Loyalty Points
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                            Earn points with every purchase
                                        </p>
                                    </div>
                                    <Award className="w-8 h-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {user?.role === "admin" ? (
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Orders
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.totalOrders}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.pendingOrders} pending
                                    </p>
                                </div>
                                <BarChart3 className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                ) : user?.role === "worker" ? (
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        My Orders
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.totalOrders}
                                    </p>
                                    {stats.pendingOrders > 0 ? (
                                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {stats.pendingOrders} pending
                                        </p>
                                    ) : (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            All completed
                                        </p>
                                    )}
                                </div>
                                <BarChart3 className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        My Orders
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stats.totalOrders}
                                    </p>
                                    {stats.pendingOrders > 0 ? (
                                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {stats.pendingOrders} pending
                                        </p>
                                    ) : (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            All completed
                                        </p>
                                    )}
                                </div>
                                <ShoppingCart className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {user?.role !== "user" ? (
                    <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Health Status
                                        </p>
                                        <StatusBadge
                                            status="placeholder"
                                            showIcon={false}
                                            className="text-xs"
                                        />
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">
                                        Good
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        No critical issues
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Shipping Status
                                        </p>
                                        <StatusBadge
                                            status="placeholder"
                                            showIcon={false}
                                            className="text-xs"
                                        />
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">
                                        Available
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Fast delivery on all products
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Quick Actions
                            </CardTitle>
                            <CardDescription>
                                {user?.role === "admin"
                                    ? "Common tasks to manage your apiary"
                                    : "Most frequently used actions"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(user?.role === "admin"
                                    ? quickActions
                                    : user?.role === "worker"
                                    ? userQuickActions
                                    : customerQuickActions
                                ).map((action, index) => (
                                    <Link key={index} to={action.link}>
                                        <Card
                                            className={`hover:shadow-md transition-shadow cursor-pointer border-2 ${action.color}`}
                                        >
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-3">
                                                    <action.icon className="w-6 h-6" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">
                                                            {action.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Recent Activity
                                <StatusBadge
                                    status="todo"
                                    showIcon={true}
                                    className="text-xs ml-auto"
                                />
                            </CardTitle>
                            <CardDescription>
                                Latest updates from your apiary
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats.recentActivity.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No recent activity</p>
                                    <p className="text-sm">
                                        Start by adding hives or recording
                                        inspections
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stats.recentActivity.map(
                                        (activity, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                                            >
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        activity.type === "hive"
                                                            ? "bg-blue-500"
                                                            : activity.type ===
                                                              "order"
                                                            ? "bg-green-500"
                                                            : "bg-yellow-500"
                                                    }`}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium">
                                                        {activity.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {activity.subtitle}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {activity.time}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {user?.role !== "user" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Today's Conditions
                                </CardTitle>
                                <div className="flex justify-center gap-2">
                                    <TimezoneDisplay
                                        showIcon={true}
                                        className="text-xs"
                                    />
                                    <StatusBadge
                                        status="static"
                                        showIcon={true}
                                        className="text-xs"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center space-y-4">
                                    <div className="text-3xl">☀️</div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            22°C
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Perfect for inspections
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        <p>Humidity: 65%</p>
                                        <p>Wind: 5 km/h</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Navigation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {user?.role !== "user" && (
                                <Link to="/dashboard/hives">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                    >
                                        <Home className="w-4 h-4 mr-2" />
                                        Manage Hives
                                    </Button>
                                </Link>
                            )}
                            {user?.role === "admin" ? (
                                <>
                                    <Link to="/dashboard/stats">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            View Statistics
                                        </Button>
                                    </Link>
                                    <Link to="/dashboard/export">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Export Reports
                                        </Button>
                                    </Link>
                                </>
                            ) : user?.role === "worker" ? (
                                <>
                                    <Link to="/dashboard/orders">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            My Orders
                                        </Button>
                                    </Link>
                                    <Link to="/dashboard/inspections">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Activity className="w-4 h-4 mr-2" />
                                            Inspections
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/dashboard/products">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <Package className="w-4 h-4 mr-2" />
                                            Browse Products
                                        </Button>
                                    </Link>
                                    <Link to="/dashboard/orders">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            My Orders
                                        </Button>
                                    </Link>
                                </>
                            )}
                            <Link to="/dashboard/help">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                >
                                    <Activity className="w-4 h-4 mr-2" />
                                    Help & Support
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                💡 Tip of the Day
                                <StatusBadge
                                    status="static"
                                    showIcon={false}
                                    className="text-xs ml-auto"
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {user?.role === "admin"
                                    ? "Regular inspections every 1-2 weeks during active season help catch issues early and ensure healthy hives."
                                    : user?.role === "worker"
                                    ? "When recording inspections, take photos of any unusual findings to help with identification of potential issues."
                                    : "Looking for premium honey products? You can easily browse our catalog and place orders directly from your dashboard."}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
