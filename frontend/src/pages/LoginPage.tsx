import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await loginUser(form);
            navigate("/dashboard");
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setError("Your account is inactive. Please contact support.");
            } else if (err?.response?.status === 429) {
                setError("Too many login attempts. Please try again later.");
            } else {
                setError("Invalid credentials or server error.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            <Card className="relative z-10 max-w-md w-full p-8 shadow-2xl rounded-xl bg-white/90 backdrop-blur-md">
                <CardContent>
                    <div className="flex flex-col items-center mb-6">
                        <div className="text-4xl mb-2">🐝</div>
                        <h1 className="text-3xl font-extrabold text-gray-800 mb-1 text-center">
                            BeeTrack Login
                        </h1>
                        <p className="text-gray-500 text-sm text-center">
                            Welcome back! Please sign in to your account.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                            className="bg-white/80"
                        />
                        <Input
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            className="bg-white/80"
                        />
                        {error && (
                            <p className="text-red-500 text-sm text-center">
                                {error}
                            </p>
                        )}
                        <Button
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded transition"
                            type="submit"
                        >
                            Login
                        </Button>
                        <div className="text-center mt-4">
                            <span className="text-gray-600 text-sm">
                                Don't have an account?{" "}
                                <a
                                    href="/register"
                                    className="text-yellow-600 hover:underline font-semibold"
                                >
                                    Register
                                </a>
                            </span>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
