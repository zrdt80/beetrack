import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUser, updateMe, updateUser } from "@/api/users";
import type { User, UpdateUserPayload } from "@/api/users";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";

export default function UserPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        role: "",
        is_active: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMe = user?.id == id;

    useEffect(() => {
        if (id) {
            getUser(id)
                .then((data: User) => {
                    setUserInfo(data);
                    setForm({
                        username: data.username || "",
                        email: data.email || "",
                        password: "",
                        role: data.role || "",
                        is_active: data.is_active ?? true,
                    });
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    const canEdit = isMe || user?.role === "admin";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({
            ...f,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSelectChange = (value: string) => {
        setForm((f) => ({
            ...f,
            role: value,
        }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setForm((f) => ({
            ...f,
            is_active: checked,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload: UpdateUserPayload = {
                username: form.username,
                email: form.email,
            };
            if (form.password) payload.password = form.password;
            if (user?.role === "admin" && !isMe) {
                payload.role = form.role;
                payload.is_active = form.is_active;
            }
            let updated: User;
            if (isMe) {
                updated = await updateMe(payload);
            } else {
                updated = await updateUser(id!, payload);
            }
            setUserInfo(updated);
            setEditMode(false);
            setForm((f) => ({ ...f, password: "" }));
        } catch (err: any) {
            setError(err?.message || "Failed to update user.");
        } finally {
            setSaving(false);
        }
    };

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
                            {!userInfo.is_active && (
                                <Badge
                                    variant="destructive"
                                    className="text-xs px-2 py-1 ml-2"
                                >
                                    Inactive
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {userInfo.email}
                        </CardDescription>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                    {editMode ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Username
                                </label>
                                <Input
                                    name="username"
                                    value={form.username}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Email
                                </label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    New Password
                                </label>
                                <Input
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleInputChange}
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                            {user?.role === "admin" && !isMe && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Role
                                        </label>
                                        <Select
                                            name="role"
                                            value={form.role}
                                            onValueChange={handleSelectChange}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="worker">
                                                    worker
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    admin
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label
                                        htmlFor="is_active"
                                        className="flex items-center justify-between py-2 bg-gray-50 rounded-md px-4 border border-input shadow-sm cursor-pointer"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                Account status
                                            </span>
                                            <br />
                                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                {form.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={form.is_active}
                                            onCheckedChange={handleSwitchChange}
                                            className="ml-4 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                                        />
                                    </label>
                                </>
                            )}
                            {error && (
                                <div className="text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    variant="default"
                                >
                                    {saving ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setEditMode(false);
                                        setForm({
                                            username: userInfo.username || "",
                                            email: userInfo.email || "",
                                            password: "",
                                            role: userInfo.role || "",
                                            is_active:
                                                userInfo.is_active ?? true,
                                        });
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <>
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
                                    {userInfo.created_at
                                        ? new Date(
                                              userInfo.created_at
                                          ).toLocaleString()
                                        : "N/A"}
                                </span>
                            </div>
                            <div className="bg-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-900 shadow-inner mb-4">
                                <p>
                                    <strong>Tip:</strong> Keep your profile up
                                    to date!
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
                            {canEdit && (
                                <Button
                                    variant="outline"
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit profile
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
