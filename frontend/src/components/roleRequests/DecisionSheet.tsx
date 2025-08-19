import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { RoleRequestStatusBadge } from "./StatusBadge";

interface DecisionSheetProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    requestId?: number | null;
    status?: string;
    username?: string;
    rationale?: string;
    onApprove: (comment?: string) => Promise<void> | void;
    onReject: (comment: string) => Promise<void> | void;
    loading?: boolean;
}

const REJECTION_TEMPLATES = [
    "Insufficient recent activity to grant elevated permissions.",
    "Please complete more hive inspections before re-applying.",
    "Profile incomplete. Add required contact details and re-submit.",
    "We need evidence of consistent order handling. Try again in 2 weeks.",
];

export function RoleRequestDecisionSheet({
    open,
    onOpenChange,
    requestId,
    status,
    username,
    rationale,
    onApprove,
    onReject,
    loading,
}: DecisionSheetProps) {
    const [comment, setComment] = useState("");
    const [tab, setTab] = useState<"approve" | "reject">("approve");
    const disabled = loading;
    const approve = async () => {
        if (disabled) return;
        await onApprove(comment || undefined);
        setComment("");
        onOpenChange(false);
    };
    const reject = async () => {
        if (disabled) return;
        if (!comment.trim()) return;
        await onReject(comment.trim());
        setComment("");
        onOpenChange(false);
    };
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle>Review Request</SheetTitle>
                    <SheetDescription>
                        {requestId ? (
                            <div className="text-sm space-y-1">
                                <div>
                                    Request{" "}
                                    <span className="font-mono text-xs">
                                        #{requestId}
                                    </span>{" "}
                                    from{" "}
                                    <span className="font-medium">
                                        {username}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RoleRequestStatusBadge
                                        status={status || "pending"}
                                    />{" "}
                                    <span className="text-xs text-slate-500">
                                        Rationale: {rationale || "—"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-slate-500">
                                Select a request to review.
                            </span>
                        )}
                    </SheetDescription>
                </SheetHeader>
                {requestId && (
                    <div className="mt-4 flex-1 flex flex-col">
                        <div className="flex border-b mb-3 text-sm gap-1">
                            <Button
                                onClick={() => setTab("approve")}
                                variant="outline"
                                className={`px-3 py-1 rounded-t-md transition-colors -mb-px border-b-2 ${
                                    tab === "approve"
                                        ? "border-emerald-500 text-emerald-700 bg-emerald-50 font-medium"
                                        : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                Approve
                            </Button>
                            <Button
                                onClick={() => setTab("reject")}
                                variant="outline"
                                className={`px-3 py-1 rounded-t-md transition-colors -mb-px border-b-2 ${
                                    tab === "reject"
                                        ? "border-red-500 text-red-700 bg-red-50 font-medium"
                                        : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                Reject
                            </Button>
                        </div>
                        {tab === "approve" && (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500">
                                    Optionally add a short note (visible to
                                    user).
                                </p>
                                <Textarea
                                    value={comment}
                                    onChange={(
                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                    ) => setComment(e.target.value)}
                                    placeholder="Optional message"
                                    className="h-28 text-sm"
                                />
                            </div>
                        )}
                        {tab === "reject" && (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500">
                                    Provide a clear, actionable rejection reason
                                    (required).
                                </p>
                                <Textarea
                                    value={comment}
                                    onChange={(
                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                    ) => setComment(e.target.value)}
                                    placeholder="Rejection reason"
                                    className="h-32 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {REJECTION_TEMPLATES.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setComment(t)}
                                            className="text-left text-[11px] bg-slate-100 hover:bg-slate-200 rounded p-2 leading-snug"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <SheetFooter className="mt-4 flex flex-col gap-2">
                    {tab === "approve" && (
                        <Button
                            disabled={disabled || !requestId}
                            onClick={approve}
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        >
                            Approve
                        </Button>
                    )}
                    {tab === "reject" && (
                        <Button
                            disabled={disabled || !comment.trim()}
                            onClick={reject}
                            className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
                        >
                            Reject
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        disabled={disabled}
                        onClick={() => onOpenChange(false)}
                        className="border-gray-300 text-slate-600 hover:bg-slate-100 shadow-sm"
                    >
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
