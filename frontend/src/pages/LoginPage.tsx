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
            setError("Invalid credentials or server error.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <Card className="max-w-md w-full p-4 shadow-lg">
                <CardContent>
                    <h1 className="text-2xl font-bold mb-4 text-center">
                        🐝 BeeTrack Login
                    </h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}
                        <Button className="w-full" type="submit">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
