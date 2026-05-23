import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CameraGuide from "@/app/components/add/CameraGuide";

describe("CameraGuide", () => {
  it("renders the framing text by default", () => {
    render(<CameraGuide />);
    expect(screen.getByText(/Encuadra el plato completo/i)).toBeInTheDocument();
  });

  it("renders nothing when active=false", () => {
    const { container } = render(<CameraGuide active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is marked aria-hidden so it doesn't interfere with screen readers", () => {
    render(<CameraGuide />);
    const overlay = screen.getByText(/Encuadra/i).closest("div[aria-hidden]");
    expect(overlay).toBeTruthy();
  });
});
