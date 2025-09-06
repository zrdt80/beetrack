import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";
import {
    getUserSessionsAdmin,
    revokeSession,
    revokeUserSessionAdmin,
    revokeAllSessions,
    revokeAllUserSessionsAdmin,
    type UserSession,
} from "@/api/auth";

export default function SessionsPage() {
    const { id } = useParams<{ id: string }>();
    const { user, sessions, fetchSessions, currentSessionId } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<number | null>(null);
    const [revokeAllLoading, setRevokeAllLoading] = useState(false);
    const [fetchAttempted, setFetchAttempted] = useState(false);
    const [userSessions, setUserSessions] = useState<UserSession[]>([]);
    const [userSessionsLoading, setUserSessionsLoading] = useState(false);

    const isMe = user ? String(user.id) === id : false;
    const isAdmin = user?.role === "admin";
    const userId = id ? Number(id) : null;

    useDocumentTitle(isMe ? "My Sessions" : "User Sessions");

    useEffect(() => {
        if (!isMe && !isAdmin) {
            navigate(-1);
            return;
        }
    }, [isMe, isAdmin, navigate]);

    useEffect(() => {
        const loadSessions = async () => {
            if (!userId) return;

            setUserSessionsLoading(true);
            try {
                if (isMe) {
                    if (!fetchAttempted) {
                        fetchSessions();
                        setFetchAttempted(true);
                    }
                    setUserSessions(sessions);
                } else {
                    const userSessionsData = await getUserSessionsAdmin(userId);
                    setUserSessions(userSessionsData);
                }
            } catch (error) {
                console.error("Failed to load sessions:", error);
                toast.error("Failed to load sessions");
            } finally {
                setUserSessionsLoading(false);
            }
        };

        loadSessions();
    }, [userId, isMe, sessions, fetchSessions, fetchAttempted]);

    const handleRevokeSession = async (sessionId: number) => {
        setLoading(sessionId);
        try {
            if (isMe) {
                await toast.promise(revokeSession(sessionId), {
                    loading: "Revoking session...",
                    success: "Session revoked",
                    error: "Failed to revoke session",
                });
            } else if (userId) {
                await toast.promise(revokeUserSessionAdmin(userId, sessionId), {
                    loading: "Revoking session...",
                    success: "Session revoked",
                    error: "Failed to revoke session",
                });
            }
            if (isMe) {
                fetchSessions();
            } else if (userId) {
                const updatedSessions = await getUserSessionsAdmin(userId);
                setUserSessions(updatedSessions);
            }
        } finally {
            setLoading(null);
        }
    };

    const handleRevokeAllSessions = async () => {
        setRevokeAllLoading(true);
        try {
            if (isMe) {
                await toast.promise(revokeAllSessions(true), {
                    loading: "Revoking other sessions...",
                    success: "All other sessions revoked",
                    error: "Failed to revoke all sessions",
                });
            } else if (userId) {
                await toast.promise(revokeAllUserSessionsAdmin(userId, true), {
                    loading: "Revoking other sessions...",
                    success: "All other sessions revoked",
                    error: "Failed to revoke all sessions",
                });
            }
            if (isMe) {
                fetchSessions();
            } else if (userId) {
                const updatedSessions = await getUserSessionsAdmin(userId);
                setUserSessions(updatedSessions);
            }
        } finally {
            setRevokeAllLoading(false);
        }
    };

    const displaySessions = isMe ? sessions : userSessions;

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
                    <h1 className="text-3xl font-bold mb-2">
                        {isMe ? "My Sessions" : "User Sessions"}
                    </h1>
                    <p className="text-gray-600">
                        {isMe
                            ? "Manage all sessions where you are logged in."
                            : "Manage sessions for this user."}
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={handleRevokeAllSessions}
                    disabled={revokeAllLoading || userSessionsLoading}
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
                            {isMe
                                ? "Logout all other sessions"
                                : "Revoke all other sessions"}
                        </>
                    )}
                </Button>
            </div>

            {userSessionsLoading && (
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

            {!userSessionsLoading && displaySessions.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                        No saved sessions
                    </h3>
                    <p className="text-slate-500 mb-2">
                        {isMe
                            ? "You are currently using a temporary session that will expire when you close your browser."
                            : "This user has no saved sessions."}
                    </p>
                    {isMe && (
                        <p className="text-amber-600 font-medium">
                            To save your session and manage multiple devices,
                            log in with the "Remember me" option checked.
                        </p>
                    )}
                    {isMe && (
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
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displaySessions.map((session) => (
                    <Card key={session.id} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 mt-2 mr-2">
                            {getDeviceIcon(session.user_agent)}
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                Session{" "}
                                {isMe && session.id === currentSessionId
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
                                    (isMe && session.id === currentSessionId)
                                }
                                className={
                                    isMe && session.id === currentSessionId
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
                                        {isMe && session.id === currentSessionId
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
