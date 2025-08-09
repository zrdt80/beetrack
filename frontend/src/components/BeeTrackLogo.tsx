import React from "react";

interface BeeTrackLogoProps {
    size?: "sm" | "md" | "lg";
    showStatus?: boolean;
    showText?: boolean;
    textTheme?: "light" | "dark";
    className?: string;
}

const BeeTrackLogo: React.FC<BeeTrackLogoProps> = ({
    size = "md",
    showStatus = true,
    showText = true,
    textTheme = "light",
    className = "",
}) => {
    const sizeClasses = {
        sm: {
            container: "w-10 h-10",
            inner: "w-7 h-7",
            text: "text-lg",
            status: "w-3 h-3 -top-0.5 -right-0.5",
            spacing: "gap-2",
            title: "text-lg",
            titleWeight: "font-semibold",
            subtitle: "text-xs",
        },
        md: {
            container: "w-14 h-14",
            inner: "w-10 h-10",
            text: "text-xl",
            status: "w-4 h-4 -top-1 -right-1",
            spacing: "gap-4",
            title: "text-2xl",
            titleWeight: "font-bold",
            subtitle: "text-sm",
        },
        lg: {
            container: "w-16 h-16",
            inner: "w-12 h-12",
            text: "text-2xl",
            status: "w-5 h-5 -top-1 -right-1",
            spacing: "gap-4",
            title: "text-3xl",
            titleWeight: "font-bold",
            subtitle: "text-base",
        },
    };
    const classes = sizeClasses[size];
    const textColors = textTheme === "light" ? "text-white" : "text-gray-900";
    const subtitleColors =
        textTheme === "light" ? "text-slate-300" : "text-gray-600";
    const containerBg =
        textTheme === "light"
            ? "bg-white/20 backdrop-blur-sm"
            : "bg-gray-900/10 backdrop-blur-sm border border-gray-200/20";
    const innerBg = textTheme === "light" ? "bg-white" : "bg-white shadow-sm";
    const statusBorder =
        textTheme === "light" ? "border-slate-900" : "border-white";

    return (
        <div className={`flex items-center ${classes.spacing} ${className}`}>
            <div className="relative">
                <div
                    className={`${classes.container} ${containerBg} rounded-xl flex items-center justify-center`}
                >
                    <div
                        className={`${classes.inner} ${innerBg} rounded-lg flex items-center justify-center`}
                    >
                        <span
                            className={`${classes.text} font-bold text-amber-600`}
                        >
                            B
                        </span>
                    </div>
                </div>
                {showStatus && (
                    <div
                        className={`absolute ${classes.status} bg-green-400 rounded-full border-2 ${statusBorder} animate-pulse`}
                    ></div>
                )}
            </div>
            {showText && (
                <div>
                    <h3
                        className={`${classes.title} ${classes.titleWeight} tracking-tight ${textColors}`}
                    >
                        BeeTrack
                    </h3>
                    <p
                        className={`${classes.subtitle} font-medium ${subtitleColors}`}
                    >
                        {size !== "sm" && "Professional "}
                        Apiary Management
                    </p>
                </div>
            )}
        </div>
    );
};

export default BeeTrackLogo;
