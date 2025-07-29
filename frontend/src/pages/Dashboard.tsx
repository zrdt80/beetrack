import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
    { to: "/dashboard", label: "🏠 Home", admin: false },
    { to: "/dashboard/hives", label: "🐝 Hives", admin: false },
    { to: "/dashboard/products", label: "📦 Products", admin: false },
    { to: "/dashboard/orders", label: "🛒 Orders", admin: false },
    { to: "/dashboard/stats", label: "📊 Stats", admin: true },
    { to: "/dashboard/export", label: "📁 Export", admin: true },
    { to: "/dashboard/users", label: "👥 Users", admin: true },
    { to: "/dashboard/help", label: "❓ Help", admin: false },
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const filteredLinks = navLinks.filter(
        (link) => !link.admin || user?.role === "admin"
    );

    return (
        <div className="min-h-screen flex bg-gray-100 bg-opacity-90">
            <aside className="hidden md:flex flex-col w-80 bg-white shadow-lg">
                <div className="h-16 flex items-center justify-center font-bold text-lg border-b">
                    Beetrack Dashboard
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {filteredLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                cn(
                                    "block px-4 py-2 rounded hover:bg-gray-100 transition",
                                    isActive && "bg-gray-200 font-semibold"
                                )
                            }
                            end={link.to === "/dashboard"}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t flex flex-col gap-3 items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-600">
                            {user?.role?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div>
                            <span className="block font-medium text-gray-800">
                                {user?.username}
                            </span>
                            <span className="block text-xs text-gray-500">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                    <Button
                        onClick={handleLogout}
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                    >
                        Logout
                    </Button>
                </div>
            </aside>

            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden absolute top-4 left-4 z-20"
                    >
                        <Menu />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                    <div className="h-16 flex items-center justify-center font-bold text-lg border-b">
                        Beetrack Dashboard
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {filteredLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    cn(
                                        "block px-4 py-2 rounded hover:bg-gray-100 transition",
                                        isActive && "bg-gray-200 font-semibold"
                                    )
                                }
                                end={link.to === "/dashboard"}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="p-4 border-t flex flex-col gap-2">
                        <span className="text-xs text-gray-500">
                            {user?.username} ({user?.role})
                        </span>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            size="sm"
                        >
                            Logout
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <main className="flex-1 p-6 md:ml-0">
                <Outlet />
            </main>
        </div>
    );
}
