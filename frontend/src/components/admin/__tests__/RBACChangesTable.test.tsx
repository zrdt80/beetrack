import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RBACChangesTable from "../RBACChangesTable";
import * as rbacApi from "@/api/rbac";

vi.mock("@/api/rbac");
const mockGetRBACChanges = vi.mocked(rbacApi.getRBACChanges);

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/datetime", () => ({
    formatDateTime: vi.fn((date: string) => `formatted-${date}`),
    localInputToUtcIso: vi.fn((date: string) => `utc-${date}`),
    utcIsoToLocalInput: vi.fn((date: string) => `local-${date}`),
}));

const mockRBACData = {
    items: [
        {
            id: 1,
            event_code: "RBAC_ROLE_ASSIGNED",
            action: "role assigned",
            details: "Admin → testuser",
            timestamp: "2025-09-30T10:00:00Z",
            user_id: 1,
            username: "admin",
            target_user_id: 2,
            metadata: {},
        },
    ],
    total: 1,
    page: 1,
    size: 20,
};

const renderWithRouter = (initialEntries = ["/"]) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <RBACChangesTable />
        </MemoryRouter>
    );
};

describe("RBACChangesTable - Basic Test", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetRBACChanges.mockResolvedValue(mockRBACData);
    });

    it("renders the component title", async () => {
        renderWithRouter();

        expect(screen.getByText("RBAC Changes")).toBeDefined();
    });

    it("displays RBAC data after loading", async () => {
        renderWithRouter();

        await waitFor(() => {
            expect(screen.queryByText("role assigned")).toBeDefined();
        });

        expect(screen.getByText("admin")).toBeDefined();
        expect(screen.getByText("Admin → testuser")).toBeDefined();
    });
});
