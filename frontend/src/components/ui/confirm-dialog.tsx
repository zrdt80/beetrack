import React, { useCallback, useMemo, useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
    ConfirmContext,
    type ConfirmFn,
    type ConfirmOptions,
} from "@/contexts/ConfirmContext";

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | undefined>(
        undefined
    );
    const [resolver, setResolver] = useState<((v: boolean) => void) | null>(
        null
    );

    const confirm = useCallback<ConfirmFn>((opts) => {
        setOptions(opts);
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleClose = useCallback(
        (result: boolean) => {
            setOpen(false);
            if (resolver) resolver(result);
            setResolver(null);
        },
        [resolver]
    );

    const ctx = useMemo(() => ({ confirm }), [confirm]);

    const {
        title = "Are you sure?",
        description = "This action cannot be undone.",
        confirmText = "Confirm",
        cancelText = "Cancel",
        destructive = false,
    } = options || {};

    return (
        <ConfirmContext.Provider value={ctx}>
            {children}
            <AlertDialog
                open={open}
                onOpenChange={(o) => !o && handleClose(false)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        {description ? (
                            <AlertDialogDescription>
                                {description}
                            </AlertDialogDescription>
                        ) : null}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => handleClose(false)}>
                            {cancelText}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={cn(
                                destructive &&
                                    "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}
                            onClick={() => handleClose(true)}
                        >
                            {confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}
