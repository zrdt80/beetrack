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

export default function StatsPage() {
    const [sales, setSales] = useState<MonthlySales[]>([]);
    const [inspections, setInspections] = useState<MonthlyInspections[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

    const fetchYearlyData = async () => {
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

        getTopProducts(5).then(setTopProducts);
    };

    useEffect(() => {
        fetchYearlyData();
    }, []);

    const sortedSales = [...sales].sort((a, b) => a.month - b.month);
    const sortedInspections = [...inspections].sort(
        (a, b) => a.month - b.month
    );

    const colors = ["#82ca9d", "#8884d8", "#ffc658", "#d62728", "#2ca02c"];

    return (
        console.log(sortedSales),
        (
            <div className="space-y-8">
                <h1 className="text-2xl font-bold">📊 BeeTrack Statistics</h1>

                <div>
                    <h2 className="text-lg font-semibold mb-2">
                        💰 Monthly Sales
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sortedSales}>
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total_sales" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">
                        🧪 Monthly Inspections
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={sortedInspections}>
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="inspections"
                                stroke="#2ca02c"
                                strokeWidth={3}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">
                        🏆 Top Selling Products
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={topProducts}
                                dataKey="sold"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#ffc658"
                                label
                            >
                                {topProducts.map((_, i) => (
                                    <Cell
                                        key={i}
                                        fill={colors[i % colors.length]}
                                    />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )
    );
}
