import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";

const DashboardHome = lazy(() => import("@/pages/DashboardHome"));
const HivesPage = lazy(() => import("@/pages/HivesPage"));
const ApiariesPage = lazy(() => import("@/pages/ApiariesPage"));
const ApiaryDetailPage = lazy(() => import("@/pages/ApiaryDetailPage"));
const InspectionsPage = lazy(() => import("@/pages/InspectionsPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const ExportPage = lazy(() => import("@/pages/ExportPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const LogsPage = lazy(() => import("@/pages/LogsPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const UserPage = lazy(() => import("@/pages/UserPage"));
const SessionsPage = lazy(() => import("@/pages/SessionsPage"));
const RoleRequestsPage = lazy(() => import("@/pages/RoleRequestsPage"));
const RoleRequestsAdminPage = lazy(
    () => import("@/pages/RoleRequestsAdminPage")
);
const RBACAdminPage = lazy(() => import("@/pages/RBACAdminPage"));
const UserSettingsLayout = lazy(() => import("@/pages/UserSettingsLayout"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading...</div>
    </div>
);

function App() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

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
                    <Route
                        index
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <DashboardHome />
                            </Suspense>
                        }
                    />
                    <Route
                        path="apiaries"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ApiariesPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="apiaries/:id"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ApiaryDetailPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="hives"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <HivesPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="hives/:id"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <InspectionsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="products"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ProductsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="orders"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <OrdersPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="stats"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <StatsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="export"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ExportPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="users"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <UsersPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="logs"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <LogsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="role-requests"
                        element={
                            user.role === "admin" ? (
                                <Suspense fallback={<PageLoader />}>
                                    <RoleRequestsAdminPage />
                                </Suspense>
                            ) : (
                                <Navigate to="/dashboard" replace />
                            )
                        }
                    />
                    <Route
                        path="rbac"
                        element={
                            user.role === "admin" ? (
                                <Suspense fallback={<PageLoader />}>
                                    <RBACAdminPage />
                                </Suspense>
                            ) : (
                                <Navigate to="/dashboard" replace />
                            )
                        }
                    />
                    <Route
                        path="role-requests/admin"
                        element={
                            <Navigate to="/dashboard/role-requests" replace />
                        }
                    />
                    <Route
                        path="help"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <HelpPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="user/:id"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <UserSettingsLayout />
                            </Suspense>
                        }
                    >
                        <Route
                            index
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <UserPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="security"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <SecurityPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="sessions"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <SessionsPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="role-requests"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <RoleRequestsPage />
                                </Suspense>
                            }
                        />
                    </Route>
                </Route>
            )}

            <Route
                path="*"
                element={<Navigate to={user ? "/dashboard" : "/login"} />}
            />
        </Routes>
    );
}

export default App;
