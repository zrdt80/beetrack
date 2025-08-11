import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHives, deleteHive } from "@/api/hives";
import type { Hive } from "@/api/hives";
import { formatDateTime } from "@/lib/datetime";
import HiveFormModal from "../components/HiveFormModel";
import HiveEditModal from "../components/HiveEditModal";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function HivesPage() {
    const [hives, setHives] = useState<Hive[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useDocumentTitle("Hives");

    const refreshHives = () => {
        getHives().then(setHives);
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

    const columns: DataTableColumn<Hive>[] = [
        {
            key: "name",
            header: "Name",
            sortable: true,
        },
        {
            key: "location",
            header: "Location",
            sortable: true,
        },
        {
            key: "status",
            header: "Status",
            sortable: true,
        },
        {
            key: "last_inspection_date",
            header: "Last Inspection",
            render: (hive) => (
                <Link
                    className="text-blue-600 underline hover:text-blue-800"
                    to={`/dashboard/hives/${hive.id}`}
                >
                    {hive.last_inspection_date
                        ? formatDateTime(hive.last_inspection_date, "date")
                        : "N/A"}
                </Link>
            ),
        },
        ...(user?.role === "admin"
            ? [
                  {
                      key: "actions" as keyof Hive,
                      header: "Actions",
                      render: (hive: Hive) => (
                          <div className="flex gap-2">
                              <HiveEditModal
                                  hive={hive}
                                  onSuccess={refreshHives}
                              />
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                      if (
                                          confirm(
                                              `Are you sure you want to delete ${hive.name}?`
                                          )
                                      ) {
                                          await deleteHive(hive.id);
                                          refreshHives();
                                      }
                                  }}
                              >
                                  Delete
                              </Button>
                          </div>
                      ),
                      className: "w-48",
                  },
              ]
            : []),
    ];

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

            <DataTable
                data={hives}
                columns={columns}
                emptyMessage="No hives found."
                className="mb-4"
            />
        </div>
    );
}
