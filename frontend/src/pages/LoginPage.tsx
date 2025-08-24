import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import BeeTrackLogo from "@/components/BeeTrackLogo";
import StatusBadge from "@/components/StatusBadge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function LoginPage() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        remember_me: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [sessionRevoked, setSessionRevoked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [twofaToken, setTwofaToken] = useState<string | null>(null);
    const [twofaCode, setTwofaCode] = useState("");
    const [twofaError, setTwofaError] = useState<string | null>(null);
    const [twofaLoading, setTwofaLoading] = useState(false);

    useDocumentTitle("Login");
    const { loginUser, loginWith2FA } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const reason = searchParams.get("reason");
        if (reason === "session_revoked") {
            setSessionRevoked(true);
        }
    }, [location.search]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, remember_me: e.target.checked });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await loginUser(form);
            navigate("/dashboard");
        } catch (err: unknown) {
            const token = ((): string | null => {
                if (err && typeof err === "object" && "twofa_token" in err) {
                    const t = (err as { twofa_token?: unknown }).twofa_token;
                    return typeof t === "string" ? t : null;
                }
                return null;
            })();
            if (token) {
                setTwofaToken(token);
                setTwofaError(null);
                setTwofaCode("");
                setIsLoading(false);
                return;
            }

            const respStatus = (err as { response?: { status?: number } })
                ?.response?.status;
            if (respStatus === 403) {
                setError(
                    "Your account is inactive. Please contact the administrator."
                );
            } else if (respStatus === 429) {
                setError("Too many login attempts. Please try again later.");
            } else if (respStatus === 401) {
                setError("Incorrect email or password.");
            } else {
                setError("An error occurred during login. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwofaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twofaToken) return;
        setTwofaError(null);
        setTwofaLoading(true);
        try {
            await loginWith2FA(twofaToken, twofaCode);
            navigate("/dashboard");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ||
                (err instanceof Error ? err.message : "Failed to verify code");
            setTwofaError(msg);
        } finally {
            setTwofaLoading(false);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            <div className="hidden lg:flex lg:flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80">
                    <div className="absolute inset-0 opacity-10">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            }}
                        ></div>
                    </div>
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/20 to-transparent"></div>
                </div>

                <div className="relative w-full z-10 flex flex-col justify-between h-full p-12 text-white overflow-y-auto items-start">
                    <BeeTrackLogo
                        size="md"
                        showStatus={false}
                        showText={true}
                    />

                    <div className="text-center space-y-10 mt-12">
                        <div className="space-y-6">
                            <h1 className="text-5xl font-bold leading-tight tracking-tight">
                                Welcome back to
                                <span className="block text-amber-200 bg-gradient-to-r from-amber-200 to-yellow-200 bg-clip-text text-transparent">
                                    BeeTrack
                                </span>
                            </h1>

                            <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
                                Continue managing your apiary operations with
                                enterprise-grade tools
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    500+
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Active Users
                                </div>
                                <StatusBadge status="static" className="mt-2" />
                            </div>
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    2.5k+
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Managed Hives
                                </div>
                                <StatusBadge status="static" className="mt-2" />
                            </div>
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    15k+
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Inspections
                                </div>
                                <StatusBadge status="static" className="mt-2" />
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-white/10">
                            <h4 className="font-semibold mb-6 text-white text-lg tracking-tight">
                                Enterprise Features
                            </h4>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Advanced Analytics
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Real-time performance metrics and
                                            insights
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Professional Reports
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Detailed PDF exports for compliance
                                            and analysis
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Disease Tracking
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Comprehensive health monitoring
                                            system
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Order Management
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Streamlined product and customer
                                            workflows
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-6 max-w-lg mx-auto border border-blue-400/20">
                            <div className="text-blue-200 font-medium mb-2 flex items-center justify-center gap-2">
                                <span className="text-xl">🔒</span>
                                Bank-level security
                            </div>
                            <div className="text-slate-300 text-sm">
                                Your data is protected with enterprise-grade
                                encryption and security protocols
                            </div>
                        </div>
                        <div className="text-center mt-12">
                            <div className="inline-flex items-center gap-4 text-slate-400 text-sm">
                                <span>Free Forever</span>
                                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                                <span>Open Source</span>
                                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                                <span>Professional Grade</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 lg:flex-none lg:w-96 xl:w-[480px] flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
                <div className="w-full max-w-sm space-y-6 py-8">
                    <div className="lg:hidden text-center mb-8">
                        <BeeTrackLogo
                            size="lg"
                            showStatus={false}
                            showText={true}
                            textTheme="dark"
                            className="justify-center"
                        />
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back
                        </h2>
                        <p className="text-gray-600">
                            Sign in to your BeeTrack account to continue.
                        </p>
                    </div>

                    {sessionRevoked && (
                        <Alert variant="default" className="mb-4">
                            <AlertTitle>Session Revoked</AlertTitle>
                            <AlertDescription>
                                Your session has been revoked. Please sign in
                                again to continue.
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!twofaToken ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            className="pl-10 h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                        <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter your password"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                            className="pl-10 pr-10 h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-1 top-1 text-gray-400 hover:text-gray-600 bg-white"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer select-none group">
                                    <span className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            name="remember_me"
                                            checked={form.remember_me}
                                            onChange={handleCheckboxChange}
                                            className="peer appearance-none h-5 w-5 border-2 border-gray-300 rounded-md bg-white checked:bg-amber-600 checked:border-amber-600 transition-colors duration-150 focus:ring-2 focus:ring-amber-400"
                                        />
                                        <span className="pointer-events-none absolute left-0 top-0 h-5 w-5 flex items-center justify-center">
                                            <svg
                                                className="opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M4 8.5L7 11.5L12 6.5"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </span>
                                    </span>
                                    <span className="text-gray-700 font-medium group-hover:text-amber-700 transition-colors">
                                        Remember me
                                    </span>
                                </label>
                                <a
                                    href="#"
                                    className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                                >
                                    Forgot password?
                                </a>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-base rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Signing in...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Sign in
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                )}
                            </Button>

                            <div className="text-center">
                                <p className="text-gray-600">
                                    Don't have an account?{" "}
                                    <Link
                                        to="/register"
                                        className="text-amber-600 hover:text-amber-700 font-semibold hover:underline"
                                    >
                                        Sign up for free
                                    </Link>
                                </p>
                            </div>
                        </form>
                    ) : (
                        <form
                            onSubmit={handleTwofaVerify}
                            className="space-y-6"
                        >
                            <div className="text-gray-700">
                                <div className="font-semibold mb-1">
                                    Two-factor authentication required
                                </div>
                                <div className="text-sm text-gray-600">
                                    Enter the 6-digit code from your
                                    authenticator app, or use a recovery code.
                                </div>
                            </div>
                            {twofaError && (
                                <Alert variant="destructive" className="mb-2">
                                    <AlertDescription>
                                        {twofaError}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div>
                                <label
                                    htmlFor="twofacode"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    2FA Code
                                </label>
                                <Input
                                    id="twofacode"
                                    name="twofacode"
                                    placeholder="123456 or recovery-code"
                                    value={twofaCode}
                                    onChange={(e) =>
                                        setTwofaCode(e.target.value)
                                    }
                                    required
                                    className="h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={twofaLoading}
                                    className="flex-1 h-12"
                                >
                                    {twofaLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Verifying...
                                        </div>
                                    ) : (
                                        "Verify"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setTwofaToken(null);
                                        setTwofaCode("");
                                    }}
                                >
                                    Back
                                </Button>
                            </div>
                        </form>
                    )}

                    {!twofaToken && (
                        <div className="text-center">
                            <p className="text-xs text-gray-500">
                                Protected by enterprise-grade security.{" "}
                                <a
                                    href="#"
                                    className="text-amber-600 hover:underline"
                                >
                                    Learn more
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
