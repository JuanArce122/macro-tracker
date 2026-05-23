import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FoodBadge from "@/app/components/FoodBadge";

describe("FoodBadge", () => {
  it("shows 'Verificado' when verifiedAt is set", () => {
    render(<FoodBadge verifiedAt={new Date()} />);
    expect(screen.getByText("Verificado")).toBeInTheDocument();
  });

  it("shows 'Verificado' when verifiedAt is an ISO string", () => {
    render(<FoodBadge verifiedAt="2026-05-22T10:00:00.000Z" />);
    expect(screen.getByText("Verificado")).toBeInTheDocument();
  });

  it("shows 'Comunidad' when verifiedAt is null", () => {
    render(<FoodBadge verifiedAt={null} />);
    expect(screen.getByText(/Comunidad/)).toBeInTheDocument();
  });

  it("includes vote count for community foods when > 0", () => {
    render(<FoodBadge verifiedAt={null} voteCount={42} />);
    expect(screen.getByText("Comunidad · 42")).toBeInTheDocument();
  });

  it("omits vote count when 0", () => {
    render(<FoodBadge verifiedAt={null} voteCount={0} />);
    expect(screen.getByText("Comunidad")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("has correct aria-label for verified", () => {
    render(<FoodBadge verifiedAt={new Date()} />);
    expect(screen.getByLabelText("Alimento verificado")).toBeInTheDocument();
  });

  it("has correct aria-label for community", () => {
    render(<FoodBadge verifiedAt={null} />);
    expect(screen.getByLabelText("Alimento comunitario")).toBeInTheDocument();
  });
});
