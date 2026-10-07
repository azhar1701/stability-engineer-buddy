import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StickyStabilityBar } from "@/components/StickyStabilityBar";
import { uatSample } from "@/lib/engine/defaults";
import { analyze } from "@/lib/engine/compute";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to?: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("StickyStabilityBar component", () => {
  it("renders live stability safety factors and status badge", () => {
    const proj = uatSample();
    const result = analyze(proj);

    render(<StickyStabilityBar project={proj} result={result} />);

    // Should display stability status and governing factors
    expect(screen.getByText("STABIL & AMAN")).toBeInTheDocument();
    expect(screen.getByText("SF Geser:")).toBeInTheDocument();
    expect(screen.getByText("SF Guling:")).toBeInTheDocument();
    expect(screen.getByText("qMax:")).toBeInTheDocument();
  });

  it("can expand to show detailed load combination drawer", () => {
    const proj = uatSample();
    const result = analyze(proj);

    render(<StickyStabilityBar project={proj} result={result} />);

    // Click 'Detail Kasus' button
    const expandBtn = screen.getByText("Detail Kasus");
    fireEvent.click(expandBtn);

    // Should show load combination table title and items
    expect(
      screen.getByText("Kombinasi Kasus Pembebanan Stabilitas")
    ).toBeInTheDocument();
    expect(screen.getByText(/Tutup Detail/i)).toBeInTheDocument();
  });

  it("can be minimized and restored via floating pill", () => {
    const proj = uatSample();
    const result = analyze(proj);

    render(<StickyStabilityBar project={proj} result={result} />);

    // Click minimize button
    const minBtn = screen.getByTitle("Kecilkan bar ke pojok bawah");
    fireEvent.click(minBtn);

    // Expect minimized pill to be visible
    const pill = screen.getByTitle(
      "Klik untuk membuka Status Evaluasi Stabilitas Melayang"
    );
    expect(pill).toBeInTheDocument();

    // Click to restore
    fireEvent.click(pill);
    expect(screen.getByText("SF Geser:")).toBeInTheDocument();
  });

  it("adapts container to wide fluid layout when fluid prop is true", () => {
    const proj = uatSample();
    const result = analyze(proj);

    const { container } = render(<StickyStabilityBar project={proj} result={result} fluid={true} />);
    const fluidContainers = container.querySelectorAll(".max-w-\\[1820px\\]");
    expect(fluidContainers.length).toBeGreaterThan(0);
  });
});
