import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfidenceBadge from "@/app/components/add/ConfidenceBadge";

describe("ConfidenceBadge", () => {
  describe("modo default (showAll: true)", () => {
    it("muestra 'Alta' para confidence >= 0.85", () => {
      render(<ConfidenceBadge confidence={0.95} />);
      expect(screen.getByText("Alta")).toBeInTheDocument();
    });

    it("muestra 'Alta' en el límite exacto 0.85", () => {
      render(<ConfidenceBadge confidence={0.85} />);
      expect(screen.getByText("Alta")).toBeInTheDocument();
    });

    it("muestra 'Media' entre 0.6 y 0.85", () => {
      render(<ConfidenceBadge confidence={0.7} />);
      expect(screen.getByText("Media")).toBeInTheDocument();
    });

    it("muestra 'Media' en el límite exacto 0.6", () => {
      render(<ConfidenceBadge confidence={0.6} />);
      expect(screen.getByText("Media")).toBeInTheDocument();
    });

    it("muestra 'Baja' debajo de 0.6", () => {
      render(<ConfidenceBadge confidence={0.4} />);
      expect(screen.getByText("Baja")).toBeInTheDocument();
    });

    it("muestra 'Baja' para confianza muy baja (0)", () => {
      render(<ConfidenceBadge confidence={0} />);
      expect(screen.getByText("Baja")).toBeInTheDocument();
    });
  });

  describe("modo compacto (showAll: false)", () => {
    it("no muestra nada para confianza alta", () => {
      const { container } = render(<ConfidenceBadge confidence={0.95} showAll={false} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("no muestra nada para confianza media", () => {
      const { container } = render(<ConfidenceBadge confidence={0.7} showAll={false} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("muestra 'Verificar' (no 'Baja') para confianza baja", () => {
      render(<ConfidenceBadge confidence={0.3} showAll={false} />);
      expect(screen.getByText("Verificar")).toBeInTheDocument();
    });
  });

  it("expone aria-labels accesibles", () => {
    const { rerender } = render(<ConfidenceBadge confidence={0.95} />);
    expect(screen.getByLabelText("Confianza alta")).toBeInTheDocument();

    rerender(<ConfidenceBadge confidence={0.7} />);
    expect(screen.getByLabelText("Confianza media")).toBeInTheDocument();

    rerender(<ConfidenceBadge confidence={0.3} />);
    expect(screen.getByLabelText(/baja/i)).toBeInTheDocument();
  });
});
