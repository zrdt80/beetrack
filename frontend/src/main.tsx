import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <ConfirmProvider>
                    <App />
                    <Toaster richColors />
                </ConfirmProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
