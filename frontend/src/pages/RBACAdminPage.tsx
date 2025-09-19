import RBACAdminPanel from "@/components/admin/RBACAdminPanel";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function RBACAdminPage() {
    useDocumentTitle("RBAC Administration");

    return <RBACAdminPanel />;
}
