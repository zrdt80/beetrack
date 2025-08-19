import { useEffect, useRef, useState } from "react";
import { getMyRoleRequestSummary } from "@/api/roleRequests";
import type { RoleRequestSummary } from "@/api/roleRequests";

interface Options {
    intervalMs?: number;
    active?: boolean;
}

export function useRoleRequestPolling(options: Options = {}) {
    const { intervalMs = 45000, active = true } = options;
    const [summary, setSummary] = useState<RoleRequestSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<number | null>(null);

    const fetchSummary = async () => {
        try {
            const data = await getMyRoleRequestSummary();
            setSummary(data);
            setError(null);
        } catch (e: any) {
            setError(e?.response?.data?.detail || e.message);
        }
    };

    useEffect(() => {
        if (!active) return;
        fetchSummary();
        timerRef.current = window.setInterval(fetchSummary, intervalMs);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [active, intervalMs]);

    return { summary, error };
}
