import { useAuth } from "@/context/AuthContext";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

export default function DashboardHome() {
    const { user } = useAuth();

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-lg shadow-lg border-0 p-8">
                <CardHeader className="flex flex-row items-center gap-6 pb-4">
                    <Avatar className="w-16 h-16 text-2xl">
                        <AvatarFallback>
                            {user?.username?.[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl font-bold mb-1">
                            Welcome, {user?.username}!
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {user?.email}
                        </CardDescription>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-sm text-gray-700 font-medium">
                            Role:
                        </span>
                        <Badge variant="outline" className="text-sm px-2 py-1">
                            {user?.role}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-800 mb-4">
                        You're logged in and ready to manage your apiary.
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                        <span>Use the navigation bar to get started</span>
                        <span role="img" aria-label="bee" className="text-lg">
                            🐝
                        </span>
                    </div>
                    <div className="bg-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-900 shadow-inner">
                        <p>
                            <strong>Tip:</strong> Keep your hive records up to
                            date for the best results!
                        </p>
                        <p className="mt-1">
                            Need help? Visit the{" "}
                            <Link
                                to="/dashboard/help"
                                className="underline font-semibold"
                            >
                                Help Center
                            </Link>{" "}
                            or contact support.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
