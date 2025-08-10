export const dateFormatOptions = {
    full: {
        year: "numeric" as const,
        month: "numeric" as const,
        day: "numeric" as const,
        hour: "2-digit" as const,
        minute: "2-digit" as const,
        second: "2-digit" as const,
        hour12: true,
    },

    datetime: {
        year: "numeric" as const,
        month: "numeric" as const,
        day: "numeric" as const,
        hour: "2-digit" as const,
        minute: "2-digit" as const,
        hour12: true,
    },

    date: {
        year: "numeric" as const,
        month: "numeric" as const,
        day: "numeric" as const,
    },

    time: {
        hour: "2-digit" as const,
        minute: "2-digit" as const,
        hour12: true,
    },

    relative: {
        numeric: "auto" as const,
        style: "long" as const,
    },
};

const utcStringToDateString = (utcString: string): string => {
    if (!utcString) return "";
    if (
        utcString.endsWith("Z") ||
        utcString.includes("+") ||
        (utcString.includes("-") && utcString.lastIndexOf("-") > 10)
    ) {
        return utcString;
    }
    if (utcString.includes("T") && !utcString.endsWith("Z")) {
        return utcString + "Z";
    }
    return utcString.replace(" ", "T") + "Z";
};

export const formatDateTime = (
    utcString: string,
    format: keyof typeof dateFormatOptions = "datetime",
    locale?: string
): string => {
    if (format === "relative") {
        return formatRelativeTime(utcString, locale);
    }
    const dateString = utcStringToDateString(utcString);
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.warn(
            "Invalid date string:",
            utcString,
            "-> formatted as:",
            dateString
        );
        return utcString;
    }

    return date.toLocaleString(locale, dateFormatOptions[format]);
};

export const formatRelativeTime = (
    utcString: string,
    locale?: string
): string => {
    const dateString = utcStringToDateString(utcString);
    const date = new Date(dateString);
    const now = new Date();

    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const absDiffInSeconds = Math.abs(diffInSeconds);

    if (absDiffInSeconds < 60) {
        return "just now";
    }

    if (absDiffInSeconds < 3600) {
        const minutes = Math.floor(absDiffInSeconds / 60);
        if (diffInSeconds > 0) {
            return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        } else {
            return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
        }
    }

    if (absDiffInSeconds < 86400) {
        const hours = Math.floor(absDiffInSeconds / 3600);
        if (diffInSeconds > 0) {
            return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        } else {
            return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
        }
    }

    if (absDiffInSeconds < 604800) {
        const days = Math.floor(absDiffInSeconds / 86400);
        if (diffInSeconds > 0) {
            return `${days} day${days !== 1 ? "s" : ""} ago`;
        } else {
            return `in ${days} day${days !== 1 ? "s" : ""}`;
        }
    }

    return date.toLocaleDateString(
        locale || "en-US",
        dateFormatOptions.datetime
    );
};

export const getUserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const getTodayForInput = (): string => {
    return formatDateForInput(new Date());
};

export const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

export const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
};

export const debugDateTime = (utcString: string): void => {
    console.log("Original UTC string:", utcString);
    console.log("User timezone:", getUserTimezone());

    const date = new Date(utcString);
    console.log("Parsed date:", date);
    console.log("UTC time:", date.toUTCString());
    console.log("Local time:", date.toString());
    console.log("ISO string:", date.toISOString());
};
