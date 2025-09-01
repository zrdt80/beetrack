import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
    getApiary,
    getApiaryHives,
    createHiveInApiary,
    type Apiary,
    listApiaryMembers,
    updateApiaryMemberRole,
    removeApiaryMember,
    type ApiaryMemberRead,
    type ApiaryMemberPage,
    type ApiaryRole,
    listApiaryInvitations,
    createApiaryInvitation,
    cancelApiaryInvitation,
    type ApiaryInvitationRead,
    type ApiaryInvitationPage,
    addApiaryMemberDirect,
} from "@/api/apiaries";
import { deleteApiary } from "@/api/apiaries";
import type { Hive, HiveCreate, HivePage } from "@/api/hives";
import { useAuth } from "@/context/AuthContext";
import {
    transferApiaryOwnership,
    type ApiaryTransferOwnershipRequest,
} from "@/api/apiaries";
import { formatDateTime } from "@/lib/datetime";
import TimezoneDisplay from "@/components/TimezoneDisplay";
import { Button } from "@/components/ui/button";

const getErr = (e: unknown): string => {
    const anyErr = e as
        | { response?: { data?: { detail?: string } } }
        | undefined;
    return (
        anyErr?.response?.data?.detail ||
        (e as Error)?.message ||
        "Unexpected error"
    );
};

export default function ApiaryDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const apiaryId = Number(id);
    const { user } = useAuth();

    const [apiary, setApiary] = useState<Apiary | null>(null);
    const [hives, setHives] = useState<Hive[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<HiveCreate>({
        name: "",
        location: "",
        status: "active",
    });
    const [creating, setCreating] = useState(false);

    const [members, setMembers] = useState<ApiaryMemberRead[]>([]);
    const [membersPage, setMembersPage] = useState(1);
    const [membersPages, setMembersPages] = useState(1);
    const [membersQ, setMembersQ] = useState("");
    const [membersLoading, setMembersLoading] = useState(false);
    const [addMemberUserId, setAddMemberUserId] = useState("");
    const [addMemberRole, setAddMemberRole] = useState<ApiaryRole>("worker");
    const [addingMember, setAddingMember] = useState(false);

    const [invitations, setInvitations] = useState<ApiaryInvitationRead[]>([]);
    const [invPage, setInvPage] = useState(1);
    const [invPages, setInvPages] = useState(1);
    const [invQ, setInvQ] = useState("");
    const [invLoading, setInvLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<ApiaryRole>("worker");
    const [inviting, setInviting] = useState(false);

    const isOwner = !!user && !!apiary && apiary.owner_id === user.id;
    const isAdmin = user?.role === "admin";

    const [transferUserId, setTransferUserId] = useState<string>("");
    const [transferring, setTransferring] = useState(false);

    const loadMain = useCallback((): Promise<void> => {
        if (!apiaryId) return Promise.resolve();
        setLoading(true);
        return Promise.all([
            getApiary(apiaryId),
            getApiaryHives(apiaryId).then((p: HivePage) => p.items),
        ])
            .then(([a, hs]) => {
                setApiary(a);
                setHives(hs);
            })
            .catch(() => setError("Failed to load apiary."))
            .finally(() => setLoading(false));
    }, [apiaryId]);

    const loadMembers = useCallback(
        (p = membersPage, q = membersQ): Promise<void> => {
            if (!apiaryId) return Promise.resolve();
            setMembersLoading(true);
            return listApiaryMembers(apiaryId, p, 10, q, false)
                .then((res: ApiaryMemberPage) => {
                    setMembers(res.items);
                    setMembersPages(res.meta.pages);
                })
                .finally(() => setMembersLoading(false));
        },
        [apiaryId, membersPage, membersQ]
    );

    const handleAddMemberDirect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin || !apiaryId) return;
        const uid = Number(addMemberUserId);
        if (!uid || Number.isNaN(uid)) return;
        setAddingMember(true);
        try {
            const p = addApiaryMemberDirect(apiaryId, {
                user_id: uid,
                role: addMemberRole,
            });
            toast.promise(p, {
                loading: "Adding member...",
                success: "Member added",
                error: (err: unknown) => getErr(err),
            });
            await p;
            setAddMemberUserId("");
            setAddMemberRole("worker");
            await loadMembers(1, membersQ);
            setMembersPage(1);
        } finally {
            setAddingMember(false);
        }
    };

    const loadInvitations = useCallback(
        (p = invPage, q = invQ): Promise<void> => {
            if (!apiaryId) return Promise.resolve();
            setInvLoading(true);
            return listApiaryInvitations(apiaryId, p, 10, q)
                .then((res: ApiaryInvitationPage) => {
                    setInvitations(res.items);
                    setInvPages(res.meta.pages);
                })
                .finally(() => setInvLoading(false));
        },
        [apiaryId, invPage, invQ]
    );

    useEffect(() => {
        loadMain();
    }, [apiaryId, loadMain]);

    useEffect(() => {
        loadMembers(1, membersQ);
        loadInvitations(1, invQ);
    }, [apiaryId, loadMembers, loadInvitations, membersQ, invQ]);

    const handleCreateHive = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        const temp: Partial<Hive> & { id: number } = {
            id: -Date.now(),
            name: form.name,
            location: form.location,
            status: form.status || "active",
        };
        const prev = [...hives];
        setHives([temp as Hive, ...hives]);
        try {
            await createHiveInApiary(apiaryId, form);
            setForm({ name: "", location: "", status: "active" });
            toast.success("Hive created");
            getApiaryHives(apiaryId).then((p: HivePage) => setHives(p.items));
        } catch (err: unknown) {
            setHives(prev);
            toast.error(getErr(err));
        } finally {
            setCreating(false);
        }
    };

    const handleMemberRoleChange = async (
        m: ApiaryMemberRead,
        role: ApiaryRole
    ) => {
        if (!(isOwner || isAdmin)) return;
        if (m.user_id === user?.id) return;
        const prev = [...members];
        setMembers(
            prev.map((x) => (x.user_id === m.user_id ? { ...x, role } : x))
        );
        try {
            await updateApiaryMemberRole(apiaryId, m.user_id, role);
            toast.success("Role updated");
            await loadMembers(1, membersQ);
            setMembersPage(1);
        } catch (err: unknown) {
            setMembers(prev);
            toast.error(getErr(err));
        }
    };

    const handleRemoveMember = async (m: ApiaryMemberRead) => {
        if (!(isOwner || isAdmin)) return;
        if (m.user_id === user?.id) return;
        const prev = [...members];
        setMembers(prev.filter((x) => x.user_id !== m.user_id));
        try {
            await removeApiaryMember(apiaryId, m.user_id);
            toast.success("Member removed");
            await loadMembers(1, membersQ);
            setMembersPage(1);
        } catch (err: unknown) {
            setMembers(prev);
            toast.error(getErr(err));
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(isOwner || isAdmin) || !inviteEmail) return;
        setInviting(true);
        try {
            const p = createApiaryInvitation(apiaryId, {
                email: inviteEmail,
                role: inviteRole,
            });
            toast.promise(p, {
                loading: "Sending invite...",
                success: "Invitation sent",
                error: (err: unknown) => getErr(err),
            });
            await p;
            setInviteEmail("");
            await loadInvitations(1, invQ);
            setInvPage(1);
        } finally {
            setInviting(false);
        }
    };

    const handleCancelInvitation = async (inv: ApiaryInvitationRead) => {
        if (!(isOwner || isAdmin) || inv.status !== "pending") return;
        const prev = [...invitations];
        setInvitations(
            prev.map((x) =>
                x.id === inv.id ? { ...x, status: "canceled" as const } : x
            )
        );
        try {
            await cancelApiaryInvitation(apiaryId, inv.id);
            toast.success("Invitation canceled");
            await loadInvitations(invPage, invQ);
        } catch (err: unknown) {
            setInvitations(prev);
            toast.error(getErr(err));
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiary) return;
        const newId = Number(transferUserId);
        if (!newId || Number.isNaN(newId)) return;
        setTransferring(true);
        const payload: ApiaryTransferOwnershipRequest = {
            new_owner_user_id: newId,
        };
        try {
            const p = transferApiaryOwnership(apiary.id, payload);
            toast.promise(p, {
                loading: "Transferring ownership...",
                success: "Ownership transferred",
                error: (err: unknown) => getErr(err),
            });
            const updated = await p;
            setApiary(updated);
            await loadMembers(1, membersQ);
            setMembersPage(1);
            await loadInvitations(1, invQ);
            setInvPage(1);
            setTransferUserId("");
        } finally {
            setTransferring(false);
        }
    };

    if (loading) return <p>Loading apiary...</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    if (!apiary) return <p>Apiary not found.</p>;

    return (
        <div className="space-y-8">
            <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6">
                <h1 className="text-2xl font-bold">{apiary.name}</h1>
                <div className="text-gray-600">{apiary.location}</div>
                <p className="text-sm text-gray-500">{apiary.description}</p>
            </div>

            {(isOwner || isAdmin) && (
                <form
                    onSubmit={handleTransfer}
                    className="flex flex-wrap gap-2 rounded-xl border bg-white shadow-sm p-4"
                >
                    <div className="font-semibold w-full">
                        Transfer Ownership
                    </div>
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="New owner user ID"
                        value={transferUserId}
                        onChange={(e) => setTransferUserId(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        disabled={transferring}
                        className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                        {transferring ? "Transferring..." : "Transfer"}
                    </button>
                </form>
            )}

            <form
                onSubmit={handleCreateHive}
                className="space-y-3 rounded-xl border bg-white shadow-sm p-4"
            >
                <div className="font-semibold">Add Hive</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                    />
                    <input
                        className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                        placeholder="Location"
                        value={form.location || ""}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, location: e.target.value }))
                        }
                    />
                    <select
                        className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                        value={form.status || "active"}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, status: e.target.value }))
                        }
                    >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                >
                    {creating ? "Creating..." : "Create Hive"}
                </button>
            </form>

            <div className="space-y-3 rounded-xl border bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Members</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setMembersPage(1);
                            loadMembers(1, membersQ);
                        }}
                        className="flex gap-2"
                    >
                        <input
                            className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                            placeholder="Search username/email"
                            value={membersQ}
                            onChange={(e) => setMembersQ(e.target.value)}
                        />
                        <button className="px-3 py-2 rounded-md bg-muted hover:bg-accent border text-gray-800">
                            Search
                        </button>
                    </form>
                </div>
                <div className="overflow-x-auto border rounded">
                    {isAdmin && (
                        <form
                            onSubmit={handleAddMemberDirect}
                            className="flex flex-wrap gap-2 p-2"
                        >
                            <input
                                className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                                placeholder="User ID"
                                value={addMemberUserId}
                                onChange={(e) =>
                                    setAddMemberUserId(e.target.value)
                                }
                                required
                            />
                            <select
                                className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                                value={addMemberRole}
                                onChange={(e) =>
                                    setAddMemberRole(
                                        e.target.value as ApiaryRole
                                    )
                                }
                            >
                                <option value="worker">worker</option>
                                <option value="manager">manager</option>
                            </select>
                            <button
                                type="submit"
                                disabled={addingMember}
                                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            >
                                {addingMember ? "Adding..." : "Add Member"}
                            </button>
                        </form>
                    )}
                    <div className="flex justify-end p-2 text-xs text-gray-500">
                        <span className="mr-1">Times shown in</span>
                        <TimezoneDisplay showIcon={false} />
                    </div>
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-3 py-2">User ID</th>
                                <th className="text-left px-3 py-2">Role</th>
                                <th className="text-left px-3 py-2">Joined</th>
                                <th className="text-left px-3 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m) => (
                                <tr key={m.id} className="border-t">
                                    <td className="px-3 py-2">{m.user_id}</td>
                                    <td className="px-3 py-2">
                                        {apiary.owner_id === m.user_id ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                Owner
                                            </span>
                                        ) : (isOwner || isAdmin) &&
                                          m.user_id !== user?.id ? (
                                            <select
                                                className="border border-gray-300 rounded-md bg-white p-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                                                value={m.role}
                                                onChange={(e) =>
                                                    handleMemberRoleChange(
                                                        m,
                                                        e.target
                                                            .value as ApiaryRole
                                                    )
                                                }
                                            >
                                                <option value="worker">
                                                    worker
                                                </option>
                                                <option value="manager">
                                                    manager
                                                </option>
                                            </select>
                                        ) : (
                                            <span>{m.role}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {formatDateTime(
                                            m.joined_at,
                                            "datetime"
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {(isOwner || isAdmin) &&
                                            m.user_id !== user?.id &&
                                            apiary.owner_id !== m.user_id && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleRemoveMember(m)
                                                    }
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                            {!membersLoading && members.length === 0 && (
                                <tr>
                                    <td className="px-3 py-3" colSpan={4}>
                                        No members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <button
                        className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                        disabled={membersPage <= 1}
                        onClick={() => {
                            const np = membersPage - 1;
                            setMembersPage(np);
                            loadMembers(np, membersQ);
                        }}
                    >
                        Prev
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {membersPage} / {membersPages}
                    </span>
                    <button
                        className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                        disabled={membersPage >= membersPages}
                        onClick={() => {
                            const np = membersPage + 1;
                            setMembersPage(np);
                            loadMembers(np, membersQ);
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-white shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Invitations</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setInvPage(1);
                            loadInvitations(1, invQ);
                        }}
                        className="flex gap-2"
                    >
                        <input
                            className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                            placeholder="Search email/status"
                            value={invQ}
                            onChange={(e) => setInvQ(e.target.value)}
                        />
                        <button className="px-3 py-2 rounded-md bg-muted hover:bg-accent border text-gray-800">
                            Search
                        </button>
                    </form>
                </div>

                {(isOwner || isAdmin) && (
                    <form
                        onSubmit={handleInvite}
                        className="flex flex-wrap gap-2 rounded-md"
                    >
                        <input
                            className="border border-gray-300 rounded-md bg-white p-2 flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-400"
                            type="email"
                            placeholder="Invitee email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                        />
                        <select
                            className="border border-gray-300 rounded-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                            value={inviteRole}
                            onChange={(e) =>
                                setInviteRole(e.target.value as ApiaryRole)
                            }
                        >
                            <option value="worker">worker</option>
                            <option value="manager">manager</option>
                        </select>
                        <button
                            type="submit"
                            disabled={inviting}
                            className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                        >
                            {inviting ? "Inviting..." : "Send Invite"}
                        </button>
                    </form>
                )}

                <div className="overflow-x-auto border rounded">
                    <div className="flex justify-end p-2 text-xs text-gray-500">
                        <span className="mr-1">Times shown in</span>
                        <TimezoneDisplay showIcon={false} />
                    </div>
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-3 py-2">Email</th>
                                <th className="text-left px-3 py-2">Role</th>
                                <th className="text-left px-3 py-2">Status</th>
                                <th className="text-left px-3 py-2">Created</th>
                                <th className="text-left px-3 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invitations.map((inv) => (
                                <tr key={inv.id} className="border-t">
                                    <td className="px-3 py-2">
                                        {inv.invitee_email}
                                    </td>
                                    <td className="px-3 py-2">{inv.role}</td>
                                    <td className="px-3 py-2">{inv.status}</td>
                                    <td className="px-3 py-2">
                                        {formatDateTime(
                                            inv.created_at,
                                            "datetime"
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {(isOwner || isAdmin) &&
                                            inv.status === "pending" && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleCancelInvitation(
                                                            inv
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                            {!invLoading && invitations.length === 0 && (
                                <tr>
                                    <td className="px-3 py-3" colSpan={5}>
                                        No invitations.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <button
                        className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                        disabled={invPage <= 1}
                        onClick={() => {
                            const np = invPage - 1;
                            setInvPage(np);
                            loadInvitations(np, invQ);
                        }}
                    >
                        Prev
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {invPage} / {invPages}
                    </span>
                    <button
                        className="px-3 py-1 rounded-md bg-muted hover:bg-accent border disabled:opacity-50"
                        disabled={invPage >= invPages}
                        onClick={() => {
                            const np = invPage + 1;
                            setInvPage(np);
                            loadInvitations(np, invQ);
                        }}
                    >
                        Next
                    </button>
                </div>
            </div>

            {(isOwner || isAdmin) && (
                <div className="rounded-xl border bg-white shadow-sm p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold m-0">
                                Danger Zone
                            </h2>
                            <p className="text-sm text-gray-600">
                                Deleting an apiary will remove it and unlink its
                                hives.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!apiary) return;
                                const confirmDelete = window.confirm(
                                    `Delete apiary "${apiary.name}"? This cannot be undone.`
                                );
                                if (!confirmDelete) return;
                                try {
                                    const p = deleteApiary(apiary.id);
                                    toast.promise(p, {
                                        loading: "Deleting apiary...",
                                        success: "Apiary deleted",
                                        error: (err: unknown) =>
                                            err instanceof Error
                                                ? err.message
                                                : "Failed to delete",
                                    });
                                    await p;
                                    navigate("/dashboard/apiaries");
                                } catch {
                                    // handled by toast
                                }
                            }}
                        >
                            Delete Apiary
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
