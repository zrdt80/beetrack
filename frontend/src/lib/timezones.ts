const FALLBACK_TIMEZONES: string[] = [
    "UTC",
    "Europe/Warsaw",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "Europe/Madrid",
    "Europe/Rome",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Kolkata",
    "Australia/Sydney",
];

export function getTimezones(): string[] {
    try {
        const intl = Intl as typeof Intl & {
            supportedValuesOf?: (
                key: "timeZone" | "language"
            ) => readonly string[];
        };
        if (typeof intl.supportedValuesOf === "function") {
            const values = intl.supportedValuesOf("timeZone");
            return Array.from(values)
                .slice()
                .sort((a, b) => a.localeCompare(b));
        }
    } catch {
        // Ignore
    }
    return FALLBACK_TIMEZONES;
}

const _RAW_TIMEZONES = getTimezones();
const _UNIQUE = Array.from(new Set(_RAW_TIMEZONES));
export const TIMEZONES: string[] = [
    "UTC",
    ..._UNIQUE.filter((z) => z !== "UTC"),
];
