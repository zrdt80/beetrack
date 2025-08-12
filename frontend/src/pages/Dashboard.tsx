import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Menu,
    Home,
    Layers3,
    Package,
    ShoppingCart,
    BarChart3,
    Download,
    Users,
    FileText,
    HelpCircle,
    LogOut,
    Settings,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BeeTrackLogo from "@/components/BeeTrackLogo";

const navLinks = [
    {
        to: "/dashboard",
        label: "Dashboard",
        icon: Home,
        admin: false,
        workerOnly: false,
    },
    {
        to: "/dashboard/hives",
        label: "Hives",
        icon: Layers3,
        admin: false,
        workerOnly: true,
    },
    {
        to: "/dashboard/products",
        label: "Products",
        icon: Package,
        admin: false,
        workerOnly: false,
    },
    {
        to: "/dashboard/orders",
        label: "Orders",
        icon: ShoppingCart,
        admin: false,
        workerOnly: false,
    },
    {
        to: "/dashboard/stats",
        label: "Analytics",
        icon: BarChart3,
        admin: true,
        workerOnly: false,
    },
    {
        to: "/dashboard/export",
        label: "Export",
        icon: Download,
        admin: true,
        workerOnly: false,
    },
    {
        to: "/dashboard/users",
        label: "Users",
        icon: Users,
        admin: true,
        workerOnly: false,
    },
    {
        to: "/dashboard/logs",
        label: "Logs",
        icon: FileText,
        admin: true,
        workerOnly: false,
    },
    {
        to: "/dashboard/sessions",
        label: "Sessions",
        icon: Shield,
        admin: false,
        workerOnly: false,
    },
    {
        to: "/dashboard/help",
        label: "Help",
        icon: HelpCircle,
        admin: false,
        workerOnly: false,
    },
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const filteredLinks = navLinks.filter(
        (link) =>
            (!link.admin || user?.role === "admin") &&
            (!link.workerOnly ||
                user?.role === "admin" ||
                user?.role === "worker")
    );

    return (
        <div className="flex min-h-screen bg-transparent">
            <aside className="hidden md:flex flex-col w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-sm fixed h-full z-10">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <BeeTrackLogo
                            size="sm"
                            showStatus={false}
                            showText={true}
                            textTheme="dark"
                        />
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6">
                    <div className="space-y-1">
                        {filteredLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    cn(
                                        "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                    )
                                }
                                end={link.to === "/dashboard"}
                            >
                                <link.icon
                                    className={cn(
                                        "w-5 h-5 flex-shrink-0 transition-colors",
                                        "group-hover:text-amber-600"
                                    )}
                                />
                                <span className="flex-1">{link.label}</span>
                                {link.admin && (
                                    <Badge
                                        variant="secondary"
                                        className="text-xs px-1.5 py-0.5"
                                    >
                                        Admin
                                    </Badge>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <Separator />

                <div className="p-4 space-y-4">
                    <div
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() =>
                            user?.id && navigate(`/dashboard/user/${user.id}`)
                        }
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                user?.id &&
                                    navigate(`/dashboard/user/${user.id}`);
                            }
                        }}
                    >
                        <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                {user?.username?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user?.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.email}
                            </p>
                        </div>
                        <Settings className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md border-gray-200"
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-60">
                    <div className="h-16 flex items-center px-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <BeeTrackLogo
                                size="sm"
                                showStatus={false}
                                showText={true}
                                textTheme="dark"
                            />
                        </div>
                    </div>

                    <nav className="flex-1 px-4 py-6">
                        <div className="space-y-1">
                            {filteredLinks.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) =>
                                        cn(
                                            "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                            isActive
                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        )
                                    }
                                    end={link.to === "/dashboard"}
                                >
                                    <link.icon
                                        className={cn(
                                            "w-5 h-5 flex-shrink-0 transition-colors",
                                            "group-hover:text-amber-600"
                                        )}
                                    />
                                    <span className="flex-1">{link.label}</span>
                                    {link.admin && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs px-1.5 py-0.5"
                                        >
                                            Admin
                                        </Badge>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </nav>

                    <Separator className="mx-4" />

                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                            <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                    {user?.username?.[0]?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.username}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user?.role}
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <main className="flex-1 md:ml-64 min-h-screen">
                <div className="p-4 md:p-6 pt-16 md:pt-4 min-h-screen bg-white/90 backdrop-blur-sm">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
