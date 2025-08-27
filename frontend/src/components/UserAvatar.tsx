import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toAvatarSrc } from "@/lib/avatar";

export type UserAvatarProps = {
    avatarUrl?: string | null;
    username?: string | null;
    className?: string;
    alt?: string;
    fallbackClassName?: string;
    imageClassName?: string;
};

export default function UserAvatar({
    avatarUrl,
    username,
    className,
    alt,
    fallbackClassName,
    imageClassName,
}: UserAvatarProps) {
    const { avatarVersion } = useAuth();
    const fallback = username?.[0]?.toUpperCase() ?? "U";
    const src = toAvatarSrc(avatarUrl, avatarVersion);
    const defaultFallbackClass =
        "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold";
    const appliedFallbackClass = fallbackClassName || defaultFallbackClass;
    return (
        <Avatar className={className}>
            {src && (
                <AvatarImage
                    className={imageClassName}
                    src={src}
                    alt={alt || username || "avatar"}
                />
            )}
            <AvatarFallback className={appliedFallbackClass}>
                {fallback}
            </AvatarFallback>
        </Avatar>
    );
}
