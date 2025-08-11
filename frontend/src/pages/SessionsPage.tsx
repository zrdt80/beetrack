import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Trash2, ShieldAlert, Clock, Shield, LogOut } from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/datetime";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function SessionsPage() {
    const {
        sessions,
        loadingSessions,
        fetchSessions,
        revokeUserSession,
        revokeAllUserSessions,
        currentSessionId,
    } = useAuth();
    const [loading, setLoading] = useState<number | null>(null);
    const [revokeAllLoading, setRevokeAllLoading] = useState(false);
    const [fetchAttempted, setFetchAttempted] = useState(false);

    useDocumentTitle("Active Sessions");

    useEffect(() => {
        if (!fetchAttempted) {
            fetchSessions();
            setFetchAttempted(true);
        }
    }, [fetchSessions, fetchAttempted]);

    const handleRevokeSession = async (sessionId: number) => {
        setLoading(sessionId);
        try {
            await revokeUserSession(sessionId);
            alert("Session revoked successfully");
        } catch (error) {
            console.error("Failed to revoke session:", error);
            alert("Failed to revoke session");
        } finally {
            setLoading(null);
        }
    };

    const handleRevokeAllSessions = async () => {
        setRevokeAllLoading(true);
        try {
            await revokeAllUserSessions(true);
            alert("All other sessions revoked successfully");
        } catch (error) {
            console.error("Failed to revoke all sessions:", error);
            alert("Failed to revoke all sessions");
        } finally {
            setRevokeAllLoading(false);
        }
    };

    const getDeviceIcon = (userAgent: string) => {
        if (!userAgent) return <Shield />;

        if (userAgent.includes("Mobile")) return <span>📱</span>;
        if (userAgent.includes("Tablet")) return <span>📱</span>;
        return <span>💻</span>;
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
                    <p className="text-gray-600">
                        Manage all sessions where you are logged in.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={handleRevokeAllSessions}
                    disabled={revokeAllLoading || loadingSessions}
                >
                    {revokeAllLoading ? (
                        <>
                            <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Revoking...
                        </>
                    ) : (
                        <>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout all other sessions
                        </>
                    )}
                </Button>
            </div>

            {loadingSessions && (
                <div className="flex justify-center py-8">
                    <svg
                        className="animate-spin h-8 w-8 text-amber-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                </div>
            )}

            {!loadingSessions && sessions.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                        No saved sessions
                    </h3>
                    <p className="text-slate-500 mb-2">
                        You are currently using a temporary session that will
                        expire when you close your browser.
                    </p>
                    <p className="text-amber-600 font-medium">
                        To save your session and manage multiple devices, log in
                        with the "Remember me" option checked.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                            if (fetchAttempted) {
                                setFetchAttempted(false);
                                fetchSessions();
                            }
                        }}
                    >
                        Refresh session list
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                    <Card key={session.id} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 mt-2 mr-2">
                            {getDeviceIcon(session.user_agent)}
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                Session{" "}
                                {session.id === currentSessionId
                                    ? "(current)"
                                    : ""}
                            </CardTitle>
                            <CardDescription>
                                <div className="flex items-center gap-1 text-xs">
                                    <Clock className="w-3 h-3" />
                                    Created{" "}
                                    {formatRelativeTime(session.created_at)}
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium">Device:</span>{" "}
                                {session.device_info || "Unknown device"}
                            </div>
                            <div>
                                <span className="font-medium">IP Address:</span>{" "}
                                {session.ip_address || "Unknown"}
                            </div>
                            <div>
                                <span className="font-medium">
                                    Last activity:
                                </span>{" "}
                                {formatRelativeTime(session.last_activity)}
                            </div>
                            <div>
                                <span className="font-medium">Expires:</span>{" "}
                                {formatDateTime(session.expires_at, "datetime")}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(session.id)}
                                disabled={
                                    loading === session.id ||
                                    session.id === currentSessionId
                                }
                                className={
                                    session.id === currentSessionId
                                        ? "cursor-not-allowed opacity-50"
                                        : ""
                                }
                            >
                                {loading === session.id ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-600"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Revoking...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {session.id === currentSessionId
                                            ? "Current session"
                                            : "Revoke session"}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
