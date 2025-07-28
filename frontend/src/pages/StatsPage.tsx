import { useEffect, useState } from "react";
import {
    getMonthlySales,
    getMonthlyInspections,
    getTopProducts,
} from "@/api/stats";
import type { MonthlySales, MonthlyInspections, TopProduct } from "@/api/stats";
import {
    ResponsiveContainer,
    BarChart,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const colors = ["#82ca9d", "#8884d8", "#ffc658", "#d62728", "#2ca02c"];

export default function StatsPage() {
    const [sales, setSales] = useState<MonthlySales[]>([]);
    const [inspections, setInspections] = useState<MonthlyInspections[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchYearlyData = async () => {
        setLoading(true);
        const year = new Date().getFullYear();
        const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

        const salesPromises = monthNumbers.map((m) =>
            getMonthlySales(year, m).catch(() => null)
        );
        const inspectionsPromises = monthNumbers.map((m) =>
            getMonthlyInspections(year, m).catch(() => null)
        );

        const salesResults = await Promise.all(salesPromises);
        const inspectionsResults = await Promise.all(inspectionsPromises);

        const validSales = salesResults.filter(Boolean) as MonthlySales[];
        const validInspections = inspectionsResults.filter(
            Boolean
        ) as MonthlyInspections[];

        setSales(validSales);
        setInspections(validInspections);

        getTopProducts(5)
            .then(setTopProducts)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchYearlyData();
    }, []);

    const sortedSales = [...sales].sort((a, b) => a.month - b.month);
    const sortedInspections = [...inspections].sort(
        (a, b) => a.month - b.month
    );

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <span>📊</span> BeeTrack Statistics
            </h1>

            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="mb-4 flex justify-center gap-4">
                    <TabsTrigger
                        value="sales"
                        className="data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground focus:outline-none focus-visible:outline-none hover:border-transparent"
                    >
                        Monthly Sales
                    </TabsTrigger>
                    <TabsTrigger
                        value="inspections"
                        className="data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground focus:outline-none focus-visible:outline-none hover:border-transparent"
                    >
                        Monthly Inspections
                    </TabsTrigger>
                    <TabsTrigger
                        value="products"
                        className="data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground focus:outline-none focus-visible:outline-none hover:border-transparent"
                    >
                        Top Products
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle>💰 Monthly Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="w-full h-[300px] rounded-lg" />
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={sortedSales}>
                                        <XAxis
                                            dataKey="month"
                                            tickFormatter={(m) =>
                                                new Date(
                                                    0,
                                                    m - 1
                                                ).toLocaleString("default", {
                                                    month: "short",
                                                })
                                            }
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar
                                            dataKey="total_sales"
                                            fill="#8884d8"
                                            radius={[6, 6, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inspections">
                    <Card>
                        <CardHeader>
                            <CardTitle>🧪 Monthly Inspections</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="w-full h-[300px] rounded-lg" />
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={sortedInspections}>
                                        <XAxis
                                            dataKey="month"
                                            tickFormatter={(m) =>
                                                new Date(
                                                    0,
                                                    m - 1
                                                ).toLocaleString("default", {
                                                    month: "short",
                                                })
                                            }
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="inspections"
                                            stroke="#2ca02c"
                                            strokeWidth={3}
                                            dot={{ r: 5 }}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="products">
                    <Card>
                        <CardHeader>
                            <CardTitle>🏆 Top Selling Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="w-full h-[300px] rounded-lg" />
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={topProducts}
                                            dataKey="sold"
                                            nameKey="product"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            fill="#ffc658"
                                            label={({ name, percent }) =>
                                                `${name} (${(
                                                    percent * 100
                                                ).toFixed(0)}%)`
                                            }
                                        >
                                            {topProducts.map((_, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={
                                                        colors[
                                                            i % colors.length
                                                        ]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Legend />
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
