import { API_BASE } from "./config";

export function toAvatarSrc(
    url?: string | null,
    version?: number,
    apiBase: string = API_BASE
): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("blob:") || url.startsWith("data:")) {
        return url;
    }
    if (/^https?:\/\//i.test(url)) {
        if (!version) return url;
        const joiner = url.includes("?") ? "&" : "?";
        return `${url}${joiner}v=${version}`;
    }
    const qs = version ? `?v=${version}` : "";
    return `${apiBase}${url}${qs}`;
}
