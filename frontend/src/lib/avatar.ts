import { API_BASE } from "./config";

export function toAvatarSrc(
    url?: string | null,
    version?: number,
    apiBase: string = API_BASE
): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return version ? `${url}?v=${version}` : url;
    const qs = version ? `?v=${version}` : "";
    return `${apiBase}${url}${qs}`;
}
