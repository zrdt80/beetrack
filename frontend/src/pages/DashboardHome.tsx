import { useAuth } from "@/context/AuthContext";

export default function DashboardHome() {
    const { user } = useAuth();

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-2">
                Welcome, {user?.username}!
            </h1>
            <p className="text-gray-600">
                You're logged in as <strong>{user?.role}</strong>.
            </p>
            <p className="mt-4">
                Use the navigation bar to manage your apiary 🐝
            </p>
        </div>
    );
}
