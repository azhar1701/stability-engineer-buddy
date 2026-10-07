import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnotatedSketch } from "@/components/AnnotatedSketch";
import { uatSample } from "@/lib/engine/defaults";
import { analyze } from "@/lib/engine/compute";

describe("AnnotatedSketch Interactive Features", () => {
  const p = uatSample();
  const a = analyze(p);

  it("renders correctly in static mode without zoom buttons", () => {
    const { container } = render(
      <AnnotatedSketch
        project={p}
        result={a}
        annotate={true}
        allowZoom={false}
        interactive={false}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByTitle("Zoom In (+)")).not.toBeInTheDocument();
  });

  it("renders zoom controls and interactive badge when interactive=true and allowZoom=true", () => {
    render(
      <AnnotatedSketch
        project={p}
        result={a}
        annotate={true}
        allowZoom={true}
        interactive={true}
        allowDrag={true}
      />
    );

    const zoomInBtn = screen.getByTitle("Zoom In (+)");
    const zoomOutBtn = screen.getByTitle("Zoom Out (-)");
    const resetBtn = screen.getByTitle("Reset Zoom & Pan (100% & Center)");

    expect(zoomInBtn).toBeInTheDocument();
    expect(zoomOutBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Kanvas Interaktif")).toBeInTheDocument();
  });

  it("increments, decrements, and resets zoom level when zoom buttons are clicked", () => {
    render(
      <AnnotatedSketch
        project={p}
        result={a}
        annotate={true}
        allowZoom={true}
        interactive={true}
      />
    );

    const zoomInBtn = screen.getByTitle("Zoom In (+)");
    const zoomOutBtn = screen.getByTitle("Zoom Out (-)");
    const resetBtn = screen.getByTitle("Reset Zoom & Pan (100% & Center)");

    // Zoom in
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText("150%")).toBeInTheDocument();

    // Zoom out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("125%")).toBeInTheDocument();

    // Reset view
    fireEvent.click(resetBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders cutoff drag handles when allowDrag=true", () => {
    render(
      <AnnotatedSketch
        project={p}
        result={a}
        annotate={true}
        interactive={true}
        allowDrag={true}
      />
    );

    // If seepage is not enabled or 0, ghost button is present, else handle with depth
    const cutoffText = screen.getByText(/Cutoff Hulu/i);
    expect(cutoffText).toBeInTheDocument();
  });

  it("triggers onClickComponent when component polygon is clicked without dragging", () => {
    const onClickComp = vi.fn();
    render(
      <AnnotatedSketch
        project={p}
        result={a}
        interactive={true}
        allowDrag={false}
        onClickComponent={onClickComp}
      />
    );

    const firstCompText = screen.getByText(p.components[0]?.name || "Tubuh Bendung");
    expect(firstCompText).toBeInTheDocument();

    // Click on component
    fireEvent.click(firstCompText.closest("g")!);
    expect(onClickComp).toHaveBeenCalledWith(0);
  });
});
