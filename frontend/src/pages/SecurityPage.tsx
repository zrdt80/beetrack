import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    startTwoFASetup,
    verifyTwoFASetup,
    regenerateTwoFARecovery,
    disableTwoFA,
    type TwoFASetupStart,
} from "@/api/users";
import QRCode from "qrcode";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SecurityPage() {
    const { user } = useAuth();
    const [setup, setSetup] = useState<TwoFASetupStart | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [code, setCode] = useState("");
    const [recovery, setRecovery] = useState<string[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [disablePassword, setDisablePassword] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [enabled, setEnabled] = useState<boolean>(
        Boolean(user?.two_factor_enabled)
    );

    useEffect(() => {
        setEnabled(Boolean(user?.two_factor_enabled));
    }, [user?.two_factor_enabled]);

    const beginSetup = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await startTwoFASetup();
            setSetup(res);
            const dataUrl = await QRCode.toDataURL(res.provisioning_uri);
            setQrDataUrl(dataUrl);
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : "Failed to start 2FA setup");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const verifySetup = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await verifyTwoFASetup(code, setup?.setup_token);
            setRecovery(res.recovery_codes);
            setEnabled(true);
            toast.success("2FA enabled");
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : "Invalid code");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const onDisable = async () => {
        setError(null);
        setLoading(true);
        try {
            const payload: { password?: string; code?: string } = {};
            if (disablePassword.trim())
                payload.password = disablePassword.trim();
            if (disableCode.trim()) payload.code = disableCode.trim();
            await disableTwoFA(payload);
            setSetup(null);
            setRecovery(null);
            setQrDataUrl("");
            setCode("");
            setDisablePassword("");
            setDisableCode("");
            setEnabled(false);
            toast.success("2FA disabled");
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : "Failed to disable 2FA");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const regenerate = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await regenerateTwoFARecovery();
            setRecovery(res.recovery_codes);
            toast.success("New recovery codes generated");
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (e instanceof Error ? e.message : "Failed to regenerate codes");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication (TOTP)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!enabled && !setup && (
                        <Button onClick={beginSetup} disabled={loading}>
                            {loading ? "Starting..." : "Enable 2FA"}
                        </Button>
                    )}
                    {!enabled && setup && (
                        <div className="space-y-4">
                            {qrDataUrl && (
                                <img
                                    src={qrDataUrl}
                                    alt="2FA QR"
                                    className="w-40 h-40"
                                />
                            )}
                            <div>
                                <div className="text-sm text-gray-600">
                                    Or enter secret manually:
                                </div>
                                <div className="font-mono text-sm">
                                    {setup.secret}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Enter 6-digit code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="max-w-[200px]"
                                />
                                <Button
                                    onClick={verifySetup}
                                    disabled={loading || !code}
                                >
                                    {loading ? "Verifying..." : "Verify"}
                                </Button>
                            </div>
                        </div>
                    )}
                    {enabled && (
                        <div className="space-y-2">
                            <div className="text-sm text-green-700">
                                2FA is currently enabled on your account.
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={regenerate}
                                    disabled={loading}
                                >
                                    Regenerate Codes
                                </Button>
                            </div>
                            <div className="mt-2 space-y-2">
                                <div className="text-sm text-gray-600">
                                    To disable 2FA, confirm with password or a
                                    valid code:
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="password"
                                        placeholder="Current password"
                                        value={disablePassword}
                                        onChange={(e) =>
                                            setDisablePassword(e.target.value)
                                        }
                                        className="max-w-[260px]"
                                    />
                                    <span className="text-xs text-gray-500">
                                        or
                                    </span>
                                    <Input
                                        placeholder="6-digit / recovery code"
                                        value={disableCode}
                                        onChange={(e) =>
                                            setDisableCode(e.target.value)
                                        }
                                        className="max-w-[220px]"
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={onDisable}
                                        disabled={
                                            loading ||
                                            (!disablePassword && !disableCode)
                                        }
                                    >
                                        {loading
                                            ? "Disabling..."
                                            : "Disable 2FA"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {recovery && (
                        <div className="mt-4">
                            <div className="font-medium mb-2">
                                Recovery Codes
                            </div>
                            <ul className="font-mono text-sm bg-gray-50 p-3 rounded border">
                                {recovery.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {error && (
                        <div className="text-sm text-red-600">{error}</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
