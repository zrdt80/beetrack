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
        <div className="min-h-screen flex">
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/80 via-amber-500/80 to-orange-600/80" />
                <div className="absolute inset-0 bg-black/10" />

                <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-lg font-bold text-amber-600">
                                    B
                                </span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">BeeTrack</h3>
                            <p className="text-white/70 text-sm">
                                Apiary Management
                            </p>
                        </div>
                    </div>

                    <div className="text-center space-y-12">
                        <div className="space-y-6">
                            <h1 className="text-5xl font-bold leading-tight">
                                Join the
                                <span className="block text-white/90">
                                    BeeTrack Community
                                </span>
                            </h1>
                            <p className="text-lg text-white/80 max-w-md mx-auto leading-relaxed">
                                Start your beekeeping journey with our free,
                                open-source platform built by the community
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white mb-2">
                                    100%
                                </div>
                                <div className="text-white/70 text-sm">
                                    Free Forever
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white mb-2">
                                    MIT
                                </div>
                                <div className="text-white/70 text-sm">
                                    Open Source
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white mb-2">
                                    24/7
                                </div>
                                <div className="text-white/70 text-sm">
                                    Available
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
                            <h4 className="font-semibold mb-6 text-white/95 text-lg">
                                Why choose us:
                            </h4>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3 text-white/85">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                    <div>
                                        <div className="font-medium">
                                            Completely Free
                                        </div>
                                        <div className="text-white/70 text-xs">
                                            No hidden costs, subscriptions, or
                                            limitations
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-white/85">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                    <div>
                                        <div className="font-medium">
                                            Open Source & Transparent
                                        </div>
                                        <div className="text-white/70 text-xs">
                                            Full source code available on GitHub
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-white/85">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                    <div>
                                        <div className="font-medium">
                                            Community Driven
                                        </div>
                                        <div className="text-white/70 text-xs">
                                            Built by beekeepers for beekeepers
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-white/85">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                    <div>
                                        <div className="font-medium">
                                            Professional Features
                                        </div>
                                        <div className="text-white/70 text-xs">
                                            Enterprise-grade tools without the
                                            cost
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 max-w-lg mx-auto border border-white/10">
                            <div className="text-white/90 font-medium mb-2">
                                🐝 Ready to start your digital beekeeping
                                journey?
                            </div>
                            <div className="text-white/70 text-sm">
                                Join hundreds of beekeepers who trust BeeTrack
                                to manage their apiaries efficiently and
                                professionally.
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-white/60 text-sm">
                            Free • Open Source • Community Driven
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 lg:flex-none lg:w-96 xl:w-[480px] flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-sm space-y-6">
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                                B
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            BeeTrack
                        </h1>
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
