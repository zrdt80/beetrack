export interface PasswordCriteria {
    length: boolean;
    upper: boolean;
    lower: boolean;
    digit: boolean;
    symbol: boolean;
    variety: boolean;
}

export interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

export interface PasswordEvaluation {
    criteria: PasswordCriteria;
    strength: PasswordStrength;
    isValid: boolean;
}

export function evaluatePassword(pwd: string): PasswordEvaluation {
    const criteria: PasswordCriteria = {
        length: pwd.length >= 8,
        upper: /[A-Z]/.test(pwd),
        lower: /[a-z]/.test(pwd),
        digit: /[0-9]/.test(pwd),
        symbol: /[^A-Za-z0-9]/.test(pwd),
        variety: new Set(pwd.split("")).size >= 4,
    };
    const all = Object.values(criteria).every(Boolean);
    const lengthPoints = Math.min(2, Math.floor(pwd.length / 8));
    const varietyPoints =
        [
            criteria.upper,
            criteria.lower,
            criteria.digit,
            criteria.symbol,
        ].filter(Boolean).length - 1;
    let raw = lengthPoints + varietyPoints;
    if (
        criteria.length &&
        criteria.upper &&
        criteria.lower &&
        criteria.digit &&
        criteria.symbol &&
        criteria.variety &&
        pwd.length >= 12
    ) {
        raw += 1;
    }
    const score = Math.min(4, Math.max(0, raw));
    const mapping: Record<number, { label: string; color: string }> = {
        0: { label: "Weak", color: "bg-red-500" },
        1: { label: "Weak", color: "bg-red-500" },
        2: { label: "Fair", color: "bg-amber-500" },
        3: { label: "Good", color: "bg-green-500" },
        4: { label: "Strong", color: "bg-emerald-600" },
    };
    return { criteria, strength: { score, ...mapping[score] }, isValid: all };
}
