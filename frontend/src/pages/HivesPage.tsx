import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHives, deleteHive } from "@/api/hives";
import type { Hive } from "@/api/hives";
import HiveFormModal from "../components/HiveFormModel";
import HiveEditModal from "../components/HiveEditModal";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function HivesPage() {
    const [hives, setHives] = useState<Hive[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const refreshHives = () => {
        getHives()
            .then(setHives)
            .catch((err) => setError("Failed to load hives."));
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getHives();
                setHives(data);
            } catch (err) {
                setError("Failed to load hives.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <p>Loading hives...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">🐝 Hives</h1>
                {user?.role === "admin" && (
                    <HiveFormModal
                        onSuccess={() => {
                            getHives().then(setHives);
                        }}
                    />
                )}
            </div>

            {hives.length === 0 ? (
                <p>No hives found.</p>
            ) : (
                <table className="w-full border border-gray-300 rounded shadow-sm bg-white">
                    <thead className="bg-gray-100">
                        <tr className="text-left">
                            <th className="p-2">Name</th>
                            <th className="p-2">Location</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Last Inspection</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hives.map((hive) => (
                            <tr key={hive.id} className="border-t">
                                <td className="p-2">{hive.name}</td>
                                <td className="p-2">{hive.location}</td>
                                <td className="p-2">{hive.status}</td>
                                <td className="p-2">
                                    <Link
                                        className="text-blue-600 underline"
                                        to={`/dashboard/hives/${hive.id}`}
                                    >
                                        {hive.last_inspection_date
                                            ? new Date(
                                                  hive.last_inspection_date
                                              ).toLocaleDateString()
                                            : "N/A"}
                                    </Link>
                                </td>
                                <td>
                                    {user?.role === "admin" && (
                                        <div className="flex gap-2">
                                            <HiveEditModal
                                                hive={hive}
                                                onSuccess={refreshHives}
                                            />
                                            <Button
                                                variant="destructive"
                                                onClick={async () => {
                                                    if (
                                                        confirm(
                                                            `Are you sure you want to delete ${hive.name}?`
                                                        )
                                                    ) {
                                                        await deleteHive(
                                                            hive.id
                                                        );
                                                        refreshHives();
                                                    }
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
