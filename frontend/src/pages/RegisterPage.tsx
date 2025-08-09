import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock,
    User,
    ArrowRight,
} from "lucide-react";
import BeeTrackLogo from "@/components/BeeTrackLogo";

export default function RegisterPage() {
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { registerUser } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await registerUser(form);
            navigate("/login");
        } catch (err: any) {
            if (err?.response?.status === 429) {
                setError(
                    "Too many registration attempts. Please try again later."
                );
            } else {
                setError("Registration failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
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
                        textTheme="light"
                    />

                    <div className="text-center space-y-10 mt-12">
                        <div className="space-y-6">
                            <h1 className="text-5xl font-bold leading-tight tracking-tight">
                                Start your journey with
                                <span className="block text-amber-200 bg-gradient-to-r from-amber-200 to-yellow-200 bg-clip-text text-transparent">
                                    BeeTrack
                                </span>
                            </h1>

                            <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
                                Join the community of professional beekeepers
                                using our free, open-source platform
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    100%
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Free Forever
                                </div>
                            </div>
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    MIT
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Open Source
                                </div>
                            </div>
                            <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    24/7
                                </div>
                                <div className="text-slate-400 text-xs uppercase tracking-wide">
                                    Available
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-white/10">
                            <h4 className="font-semibold mb-6 text-white text-lg tracking-tight">
                                Community-Driven Benefits
                            </h4>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Completely Free
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            No subscriptions, hidden fees, or
                                            limitations
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Open Source Transparency
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Full source code available on GitHub
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Built by Experts
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Created by beekeepers for beekeepers
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0 mt-2"></div>
                                    <div className="text-left">
                                        <div className="font-medium text-white">
                                            Enterprise Features
                                        </div>
                                        <div className="text-slate-400 text-xs">
                                            Professional tools without the
                                            enterprise cost
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl p-6 max-w-lg mx-auto border border-amber-400/20">
                            <div className="text-amber-200 font-medium mb-2 flex items-center justify-center gap-2">
                                <span className="text-xl">🐝</span>
                                Ready to transform your beekeeping?
                            </div>
                            <div className="text-slate-300 text-sm">
                                Join hundreds of beekeepers who have modernized
                                their apiary management with BeeTrack
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

            <div className="flex-1 lg:flex-none lg:w-96 xl:w-[480px] flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-sm space-y-6">
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
                            Create your account
                        </h2>
                        <p className="text-gray-600">
                            Join the free BeeTrack community today.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Username
                                </label>
                                <div className="relative">
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="Choose a username"
                                        value={form.username}
                                        onChange={handleChange}
                                        required
                                        className="pl-10 h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                    />
                                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Email
                                </label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email"
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
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Create a password"
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
                                <p className="text-xs text-gray-500 mt-1">
                                    Must be at least 6 characters long
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-600 text-sm font-medium">
                                    {error}
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-base rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Create account
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            )}
                        </Button>

                        <div className="text-center">
                            <p className="text-gray-600">
                                Already have an account?{" "}
                                <Link
                                    to="/login"
                                    className="text-amber-600 hover:text-amber-700 font-semibold hover:underline"
                                >
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </form>

                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            By creating an account, you agree to our{" "}
                            <a
                                href="#"
                                className="text-amber-600 hover:underline"
                            >
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                                href="#"
                                className="text-amber-600 hover:underline"
                            >
                                Privacy Policy
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
