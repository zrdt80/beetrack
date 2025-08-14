import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { evaluatePassword } from "@/lib/password";
import { Eye, EyeOff, Check, X, Lock } from "lucide-react";

interface PasswordFieldProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    showChecklist?: boolean;
    showStrength?: boolean;
    required?: boolean;
    disabled?: boolean;
    autoComplete?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
    value,
    onChange,
    label = "Password",
    placeholder = "Enter password",
    showChecklist = true,
    showStrength = true,
    required = false,
    disabled = false,
    autoComplete = "new-password",
}) => {
    const [show, setShow] = useState(false);
    const [touched, setTouched] = useState(false);
    const evaluation = evaluatePassword(value);

    const criteriaList: {
        key: keyof typeof evaluation.criteria;
        label: string;
    }[] = [
        { key: "length", label: "At least 8 characters" },
        { key: "upper", label: "Contains uppercase letter" },
        { key: "lower", label: "Contains lowercase letter" },
        { key: "digit", label: "Contains a digit" },
        { key: "symbol", label: "Contains a special symbol" },
        { key: "variety", label: "Varied (≥4 unique chars)" },
    ];

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <Input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (!touched) setTouched(true);
                    }}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    className="pl-10 pr-10 h-12 bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-1 top-1 text-gray-400 hover:text-gray-600 bg-white"
                    aria-label={show ? "Hide password" : "Show password"}
                >
                    {show ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>
            {showStrength && value && (
                <div className="mt-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded">
                            <div
                                className={`h-1.5 rounded transition-all ${evaluation.strength.color}`}
                                style={{
                                    width: `${
                                        (evaluation.strength.score / 4) * 100
                                    }%`,
                                }}
                            />
                        </div>
                        <span
                            className={`text-xs font-medium ${
                                evaluation.strength.score < 2
                                    ? "text-red-600"
                                    : evaluation.strength.score === 2
                                    ? "text-amber-600"
                                    : "text-green-600"
                            }`}
                        >
                            {evaluation.strength.label}
                        </span>
                    </div>
                </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
                Password must have at least 8 chars including upper, lower,
                digit & symbol.
            </p>
            {showChecklist && touched && value && (
                <div className="mt-2 space-y-1 text-xs">
                    {criteriaList.map((item) => {
                        const ok = evaluation.criteria[item.key];
                        const Icon = ok ? Check : X;
                        return (
                            <div
                                key={item.key}
                                className={`flex items-center gap-1 ${
                                    ok ? "text-green-600" : "text-gray-500"
                                }`}
                            >
                                <Icon className="w-3 h-3" />
                                <span>{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PasswordField;
