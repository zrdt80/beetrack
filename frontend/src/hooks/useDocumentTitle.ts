import { useEffect } from "react";

export function useDocumentTitle(
    title: string,
    siteName: string = "BeeTrack"
): void {
    useEffect(() => {
        const formattedTitle = siteName ? `${title} | ${siteName}` : title;
        document.title = formattedTitle;
        return () => {
            document.title = siteName;
        };
    }, [title, siteName]);
}

export default useDocumentTitle;
