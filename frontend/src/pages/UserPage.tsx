import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUser } from "@/api/users";
import type { User } from "@/api/users";
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

export default function UserPage() {
    const { id } = useParams<{ id: string }>();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getUser(id)
                .then((data) => setUserInfo(data))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[80vh]">
                <span>Loading user info...</span>
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div className="flex justify-center items-center min-h-[80vh]">
                <span>User not found.</span>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-lg shadow-lg border-0 p-8">
                <CardHeader className="flex flex-row items-center gap-6 pb-4">
                    <Avatar className="w-16 h-16 text-2xl">
                        <AvatarFallback>
                            {userInfo.username?.[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl font-bold mb-1">
                            {userInfo.username}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {userInfo.email}
                        </CardDescription>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-sm text-gray-700 font-medium">
                            Role:
                        </span>
                        <Badge
                            variant={
                                userInfo.role === "admin"
                                    ? "destructive"
                                    : "secondary"
                            }
                            className={
                                userInfo.role === "admin"
                                    ? "text-xs px-3 py-1"
                                    : "text-xs px-3 py-1 bg-yellow-100 text-yellow-800 border-yellow-200"
                            }
                        >
                            {userInfo.role}
                        </Badge>
                    </div>
                    <div className="mb-4 flex items-center gap-3">
                        <span className="text-sm text-gray-700 font-medium">
                            Joined:
                        </span>
                        <span className="text-sm">
                            {userInfo.createdAt
                                ? new Date(
                                      userInfo.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
                        </span>
                        <Badge
                            variant={
                                userInfo.isActive ? "default" : "destructive"
                            }
                            className="text-xs px-2 py-1"
                        >
                            {userInfo.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                    <div className="bg-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-900 shadow-inner">
                        <p>
                            <strong>Tip:</strong> Keep your profile up to date!
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
