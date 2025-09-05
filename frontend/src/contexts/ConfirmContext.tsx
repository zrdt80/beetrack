import React, { createContext } from "react";

export type ConfirmOptions = {
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

export type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

export type ConfirmContextValue = {
    confirm: ConfirmFn;
} | null;

export const ConfirmContext = createContext<ConfirmContextValue>(null);
