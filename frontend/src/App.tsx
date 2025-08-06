import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";
import DashboardHome from "@/pages/DashboardHome";
import HivesPage from "@/pages/HivesPage";
import InspectionsPage from "@/pages/InspectionsPage";
import ProductsPage from "@/pages/ProductsPage";
import OrdersPage from "@/pages/OrdersPage";
import StatsPage from "@/pages/StatsPage";
import ExportPage from "@/pages/ExportPage";
import UsersPage from "@/pages/UsersPage";
import LogsPage from "@/pages/LogsPage";
import HelpPage from "@/pages/HelpPage";
import UserPage from "@/pages/UserPage";

function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route
                path="/login"
                element={!user ? <LoginPage /> : <Navigate to="/dashboard" />}
            />
            <Route
                path="/register"
                element={!user ? <RegisterPage /> : <Navigate to="/login" />}
            />

            {user && (
                <Route path="/dashboard" element={<Dashboard />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="hives" element={<HivesPage />} />
                    <Route path="hives/:id" element={<InspectionsPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="export" element={<ExportPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="help" element={<HelpPage />} />
                    <Route
                        path="user/:id"
                        element={user ? <UserPage /> : <Navigate to="/login" />}
                    />
                </Route>
            )}

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
