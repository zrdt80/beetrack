import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <div className="flex space-x-4">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            isActive ? "font-bold" : ""
                        }
                    >
                        🏠 Home
                    </NavLink>
                    <NavLink to="/dashboard/hives">🐝 Hives</NavLink>
                    <NavLink to="/dashboard/products">📦 Products</NavLink>
                    <NavLink to="/dashboard/orders">🛒 Orders</NavLink>
                    {user?.role === "admin" && (
                        <>
                            <NavLink to="/dashboard/stats">📊 Stats</NavLink>
                            <NavLink to="/dashboard/export">📁 Export</NavLink>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm">
                        {user?.username} ({user?.role})
                    </span>
                    <Button onClick={handleLogout} variant="destructive">
                        Logout
                    </Button>
                </div>
            </nav>

            <main className="p-6">
                <Outlet />
            </main>
        </div>
    );
}
