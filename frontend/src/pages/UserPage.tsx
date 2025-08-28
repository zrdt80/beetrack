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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/shadcn-io/dropzone";
import AvatarCropper from "@/components/AvatarCropper";
import { Upload, Trash2 } from "lucide-react";
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
import axios from "axios";

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
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
    const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
    const [localAvatarVersion, setLocalAvatarVersion] = useState<
        number | undefined
    >(undefined);
    const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
        null
    );
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(
        null
    );
    const [pendingAvatarAction, setPendingAvatarAction] = useState<
        "upload" | "delete" | null
    >(null);
    const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(
        null
    );
    const isMe = user ? String(user.id) === id : false;
    const passwordEval = evaluatePassword(form.password || "");
    const passwordValid = !form.password || passwordEval.isValid;
    const canEdit = isMe || user?.role === "admin";

    useDocumentTitle(
        userInfo ? `${userInfo.username} – Profile` : "User Profile"
    );

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const u = await getUser(Number(id!));
                if (!mounted) return;
                setUserInfo(u);
                setForm({
                    username: u.username || "",
                    email: u.email || "",
                    password: "",
                    role: u.role || "",
                    is_active: u.is_active ?? true,
                    theme: u.theme || "system",
                    timezone: u.timezone || "UTC",
                    locale: u.locale || "en",
                });
            } catch (err: unknown) {
                if (!mounted) return;
                const msg =
                    (err as { response?: { data?: { detail?: string } } })
                        ?.response?.data?.detail ||
                    (err instanceof Error
                        ? err.message
                        : "Failed to load user.");
                setError(msg);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    useEffect(() => {
        return () => {
            if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
        };
    }, [pendingObjectUrl]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        setForm((f) => ({ ...f, role: value }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setForm((f) => ({ ...f, is_active: checked }));
    };

    const handlePrefChange = (
        key: "theme" | "timezone" | "locale",
        value: string
    ) => {
        setForm((f) => ({ ...f, [key]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
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
                try {
                    if (pendingAvatarAction === "upload" && pendingAvatarBlob) {
                        const file = new File(
                            [pendingAvatarBlob],
                            "avatar.webp",
                            {
                                type: pendingAvatarBlob.type || "image/webp",
                            }
                        );
                        await uploadMyAvatar(file as unknown as File);
                    } else if (pendingAvatarAction === "delete") {
                        await deleteMyAvatar();
                    }
                } catch (err) {
                    let detail: string | undefined;
                    if (axios.isAxiosError(err)) {
                        const data = err.response?.data as unknown;
                        if (
                            data &&
                            typeof data === "object" &&
                            "detail" in data
                        ) {
                            const d = (data as { detail?: unknown }).detail;
                            if (typeof d === "string") detail = d;
                        }
                    }
                    throw new Error(
                        detail ||
                            (pendingAvatarAction === "upload"
                                ? "Avatar upload failed."
                                : "Avatar delete failed.")
                    );
                } finally {
                    if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
                    setPendingObjectUrl(null);
                    setPendingAvatarBlob(null);
                    setPendingAvatarAction(null);
                }

                await refreshProfile();
                bumpAvatarVersion();
                setAvatarChanged(false);
                setLocalAvatarUrl(null);
                setLocalAvatarVersion(undefined);
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
                    <div className="relative group">
                        <UserAvatar
                            className="w-16 h-16 text-2xl"
                            avatarUrl={localAvatarUrl ?? userInfo.avatar_url}
                            username={userInfo.username}
                            alt={userInfo.username}
                            versionOverride={localAvatarVersion}
                        />
                        {isMe && editMode && (
                            <button
                                type="button"
                                onClick={() => setAvatarDialogOpen(true)}
                                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                aria-label="Change avatar"
                            >
                                <Upload className="w-6 h-6 text-white" />
                            </button>
                        )}
                    </div>
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
                <Dialog
                    open={avatarDialogOpen}
                    onOpenChange={setAvatarDialogOpen}
                >
                    <DialogContent showClose={false}>
                        <DialogHeader>
                            <DialogTitle>Update Avatar</DialogTitle>
                            <DialogDescription>
                                Upload a new profile picture (PNG, JPG, or WEBP
                                up to 5MB). Drag & drop or click to select.
                                Removing will clear your current avatar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {!pendingFile ? (
                                <>
                                    <Dropzone
                                        accept={{ "image/*": [] }}
                                        maxSize={5 * 1024 * 1024}
                                        onError={(e) => {
                                            setAvatarUploadError(
                                                e?.message ||
                                                    "Upload failed. Max size 5MB and only images are allowed."
                                            );
                                        }}
                                        onDrop={(files) => {
                                            const file = files[0];
                                            if (!file) return;
                                            setPendingFile(file);
                                            setAvatarUploadError(null);
                                        }}
                                    >
                                        <div className="flex flex-col items-center">
                                            <Upload className="w-5 h-5 mb-2" />
                                            <p className="text-sm">
                                                Drag & drop or click to upload
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                PNG, JPG, WEBP up to 5MB
                                            </p>
                                        </div>
                                    </Dropzone>
                                    {avatarUploadError && (
                                        <p className="text-xs text-red-600">
                                            {avatarUploadError}
                                        </p>
                                    )}
                                    {userInfo.avatar_url && (
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-muted-foreground">
                                                Current avatar set
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => {
                                                    setPendingAvatarAction(
                                                        "delete"
                                                    );
                                                    setPendingAvatarBlob(null);
                                                    if (pendingObjectUrl) {
                                                        URL.revokeObjectURL(
                                                            pendingObjectUrl
                                                        );
                                                        setPendingObjectUrl(
                                                            null
                                                        );
                                                    }
                                                    setLocalAvatarUrl(null);
                                                    setLocalAvatarVersion(
                                                        Date.now()
                                                    );
                                                    setAvatarChanged(true);
                                                    setPendingFile(null);
                                                    setAvatarDialogOpen(false);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />{" "}
                                                Remove avatar
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <AvatarCropper
                                    file={pendingFile}
                                    onCancel={() => setPendingFile(null)}
                                    onCropped={async (blob) => {
                                        try {
                                            if (pendingObjectUrl) {
                                                URL.revokeObjectURL(
                                                    pendingObjectUrl
                                                );
                                                setPendingObjectUrl(null);
                                            }
                                            const url =
                                                URL.createObjectURL(blob);
                                            setPendingObjectUrl(url);
                                            setLocalAvatarUrl(url);
                                            setLocalAvatarVersion(Date.now());
                                            setPendingAvatarBlob(blob);
                                            setPendingAvatarAction("upload");
                                            setAvatarChanged(true);
                                            setPendingFile(null);
                                            setAvatarDialogOpen(false);
                                        } catch {
                                            setAvatarUploadError(
                                                "Avatar preview failed. Try a different image."
                                            );
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setAvatarDialogOpen(false);
                                    setPendingFile(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                        setLocalAvatarUrl(null);
                                        setLocalAvatarVersion(undefined);
                                        setAvatarChanged(false);
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
                                    Need help? Visit the
                                    <Link
                                        to="/dashboard/help"
                                        className="underline font-semibold ml-1"
                                    >
                                        Help Center
                                    </Link>
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
