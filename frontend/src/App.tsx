import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import DashboardHome from "@/pages/DashboardHome";
import HivesPage from "@/pages/HivesPage";
import InspectionsPage from "@/pages/InspectionsPage";
import ProductsPage from "@/pages/ProductsPage";
import OrdersPage from "@/pages/OrdersPage";
import StatsPage from "@/pages/StatsPage";
import ExportPage from "@/pages/ExportPage";

const Placeholder = ({ name }: { name: string }) => (
    <div>{name} – coming soon</div>
);

function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route
                path="/login"
                element={!user ? <LoginPage /> : <Navigate to="/dashboard" />}
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
                    <Route path="todo" element={<Placeholder name="ToDo" />} />
                </Route>
            )}

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
