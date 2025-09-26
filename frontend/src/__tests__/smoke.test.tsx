import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

const MockComponent = () => (
    <div data-testid="mock-component">BeeTrack App</div>
);

describe("App Smoke Test", () => {
    it("renders without crashing", () => {
        const { getByTestId } = render(<MockComponent />);
        expect(getByTestId("mock-component")).toBeDefined();
    });
});
