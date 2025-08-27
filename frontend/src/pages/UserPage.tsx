import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUser, updateMe, updateUser } from "@/api/users";
import type { User, UpdateUserPayload } from "@/api/users";
import { formatDateTime } from "@/lib/datetime";
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
import UserAvatar from "@/components/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
    Combobox,
    ComboboxTrigger,
    ComboboxContent,
    ComboboxInput,
    ComboboxList,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxGroup,
} from "@/components/ui/shadcn-io/combobox";
import { uploadMyAvatar, deleteMyAvatar } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import PasswordField from "@/components/PasswordField";
import { evaluatePassword } from "@/lib/password";
import { TIMEZONES } from "@/lib/timezones";
import { LOCALES } from "@/lib/locales";
import StatusBadge from "@/components/StatusBadge";

export default function UserPage() {
    const { id } = useParams<{ id: string }>();
    const { user, refreshProfile, bumpAvatarVersion } = useAuth();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        role: "",
        is_active: true,
        theme: "system",
        timezone: "UTC",
        locale: "en",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarChanged, setAvatarChanged] = useState<boolean>(false);
    const isMe = user?.id == id;
    const passwordEval = evaluatePassword(form.password || "");
    const passwordValid = !form.password || passwordEval.isValid;

    useEffect(() => {
        if (id) {
            getUser(Number(id))
                .then((data: User) => {
                    const tz = TIMEZONES.includes(data.timezone || "")
                        ? data.timezone!
                        : "UTC";
                    const loc = LOCALES.some(
                        (l) => l.code === (data.locale || "")
                    )
                        ? data.locale!
                        : "en";
                    setUserInfo(data);
                    setForm({
                        username: data.username || "",
                        email: data.email || "",
                        password: "",
                        role: data.role || "",
                        is_active: data.is_active ?? true,
                        theme: data.theme || "system",
                        timezone: tz,
                        locale: loc,
                    });
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    useDocumentTitle(userInfo ? `User: ${userInfo.username}` : "User Profile");

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

    const handlePrefChange = (
        key: "theme" | "timezone" | "locale",
        value: string
    ) => {
        setForm((f) => ({ ...f, [key]: value }));
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
                theme: form.theme,
                timezone: form.timezone,
                locale: form.locale,
            };
            if (form.password) payload.password = form.password;
            if (user?.role === "admin" && !isMe) {
                payload.role = form.role;
                payload.is_active = form.is_active;
            }
            let updated: User;
            if (isMe) {
                const result = await updateMe(payload);
                if (!result) throw new Error("Failed to update user.");
                updated = result;
            } else {
                updated = await updateUser(Number(id!), payload);
            }
            setUserInfo(updated);
            if (avatarChanged) {
                await refreshProfile();
                bumpAvatarVersion();
                setAvatarChanged(false);
            }
            setEditMode(false);
            setForm((f) => ({ ...f, password: "" }));
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (err instanceof Error ? err.message : "Failed to update user.");
            setError(msg);
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
        <div className="w-full max-w-2xl mx-auto">
            <Card className="shadow-sm border-0 p-0">
                <CardHeader className="flex flex-row items-center gap-6 pb-4">
                    <UserAvatar
                        className="w-16 h-16 text-2xl"
                        avatarUrl={userInfo.avatar_url}
                        username={userInfo.username}
                        alt={userInfo.username}
                    />
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
                                    Avatar
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={async (e) => {
                                            if (
                                                e.target.files &&
                                                e.target.files[0]
                                            ) {
                                                try {
                                                    await uploadMyAvatar(
                                                        e.target.files[0]
                                                    );
                                                    setAvatarChanged(true);
                                                } catch (err) {
                                                    console.error(
                                                        "Avatar upload failed",
                                                        err
                                                    );
                                                }
                                            }
                                        }}
                                    />
                                    {userInfo.avatar_url && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                try {
                                                    await deleteMyAvatar();
                                                    setAvatarChanged(true);
                                                } catch (err) {
                                                    console.error(
                                                        "Avatar delete failed",
                                                        err
                                                    );
                                                }
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
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
                                <PasswordField
                                    value={form.password}
                                    onChange={(v) =>
                                        setForm((f) => ({ ...f, password: v }))
                                    }
                                    label="New Password"
                                    placeholder="Leave blank to keep current"
                                    required={false}
                                />
                                {!passwordValid && form.password && (
                                    <p className="text-xs text-red-600 mt-1">
                                        Password does not meet requirements.
                                    </p>
                                )}
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
                                                <SelectItem value="user">
                                                    User
                                                </SelectItem>
                                                <SelectItem value="worker">
                                                    Worker
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    Admin
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                        <span>Theme</span>
                                        <StatusBadge
                                            status="not-implemented"
                                            showIcon={false}
                                            className="text-[10px]"
                                        />
                                    </label>
                                    <Combobox
                                        data={[
                                            {
                                                value: "system",
                                                label: "System",
                                            },
                                            { value: "light", label: "Light" },
                                            { value: "dark", label: "Dark" },
                                        ]}
                                        type="theme"
                                        value={form.theme}
                                        onValueChange={(v) =>
                                            handlePrefChange("theme", v)
                                        }
                                    >
                                        <ComboboxTrigger className="w-full" />
                                        <ComboboxContent>
                                            <ComboboxInput />
                                            <ComboboxList>
                                                <ComboboxEmpty />
                                                <ComboboxGroup>
                                                    <ComboboxItem value="system">
                                                        System
                                                    </ComboboxItem>
                                                    <ComboboxItem value="light">
                                                        Light
                                                    </ComboboxItem>
                                                    <ComboboxItem value="dark">
                                                        Dark
                                                    </ComboboxItem>
                                                </ComboboxGroup>
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                        <span>Timezone</span>
                                        <StatusBadge
                                            status="not-implemented"
                                            showIcon={false}
                                            className="text-[10px]"
                                        />
                                    </label>
                                    <Combobox
                                        data={TIMEZONES.map((tz) => ({
                                            value: tz,
                                            label: tz,
                                        }))}
                                        type="timezone"
                                        value={form.timezone}
                                        onValueChange={(v) =>
                                            handlePrefChange("timezone", v)
                                        }
                                    >
                                        <ComboboxTrigger className="w-full" />
                                        <ComboboxContent>
                                            <ComboboxInput />
                                            <ComboboxList>
                                                <ComboboxEmpty />
                                                <ComboboxGroup>
                                                    {TIMEZONES.map((tz) => (
                                                        <ComboboxItem
                                                            key={tz}
                                                            value={tz}
                                                        >
                                                            {tz}
                                                        </ComboboxItem>
                                                    ))}
                                                </ComboboxGroup>
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                        <span>Locale</span>
                                        <StatusBadge
                                            status="not-implemented"
                                            showIcon={false}
                                            className="text-[10px]"
                                        />
                                    </label>
                                    <Combobox
                                        data={LOCALES.map((l) => ({
                                            value: l.code,
                                            label: `${l.label} (${l.code})`,
                                        }))}
                                        type="locale"
                                        value={form.locale}
                                        onValueChange={(v) =>
                                            handlePrefChange("locale", v)
                                        }
                                    >
                                        <ComboboxTrigger className="w-full" />
                                        <ComboboxContent>
                                            <ComboboxInput />
                                            <ComboboxList>
                                                <ComboboxEmpty />
                                                <ComboboxGroup>
                                                    {LOCALES.map((l) => (
                                                        <ComboboxItem
                                                            key={l.code}
                                                            value={l.code}
                                                        >
                                                            {l.label} ({l.code})
                                                        </ComboboxItem>
                                                    ))}
                                                </ComboboxGroup>
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                            </div>
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
                                            theme: userInfo.theme || "system",
                                            timezone:
                                                userInfo.timezone || "UTC",
                                            locale: userInfo.locale || "en",
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
                                        ? formatDateTime(
                                              userInfo.created_at,
                                              "datetime"
                                          )
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
