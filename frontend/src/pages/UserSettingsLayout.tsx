import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User as UserIcon, Shield, Bell, ArrowLeft } from "lucide-react";

type SettingsItem = {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
};

export default function UserSettingsLayout() {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const base = `/dashboard/user/${id}`;

    const items: SettingsItem[] = [
        { to: base, label: "My Account", icon: UserIcon, end: true },
        { to: `${base}/sessions`, label: "Sessions", icon: Shield },
        { to: `${base}/role-requests`, label: "Role Requests", icon: Bell },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <aside className="w-full md:w-64 md:flex-shrink-0">
                <div className="hidden md:block sticky top-4">
                    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 p-4 border-b">
                            <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                    {user?.username?.[0]?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {user?.username}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {user?.email}
                                </div>
                            </div>
                        </div>
                        <nav className="py-2">
                            {items.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.end}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                            isActive
                                                ? "bg-amber-50 text-amber-700"
                                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        )
                                    }
                                >
                                    <link.icon className="w-4 h-4" />
                                    <span>{link.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                    <Button
                        variant="outline"
                        className="mt-3 w-full justify-start text-gray-600"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>

                <div className="md:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                    </div>
                    <ScrollArea className="w-full">
                        <div className="flex gap-2 pb-2">
                            {items.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.end}
                                    className={({ isActive }) =>
                                        cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs",
                                            isActive
                                                ? "bg-amber-100 border-amber-200 text-amber-700"
                                                : "bg-white border-gray-200 text-gray-700"
                                        )
                                    }
                                >
                                    <link.icon className="w-3.5 h-3.5" />
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>
                    </ScrollArea>
                    <Separator className="my-3" />
                </div>
            </aside>

            <section className="flex-1 min-w-0">
                <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6">
                    <Outlet />
                </div>
            </section>
        </div>
    );
}
