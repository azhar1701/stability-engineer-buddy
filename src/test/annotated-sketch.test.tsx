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

  it("renders apron drag handles and ghost buttons when allowDrag=true", () => {
    // 1. With apron = 0: ghost handles are displayed
    const { rerender } = render(
      <AnnotatedSketch
        project={{
          ...p,
          seepage: { enabled: true, dCutoffUp: 1.5, dCutoffDown: 2.0, lApronUp: 0, lApronDown: 0, soilType: "PASIR_SEDANG" },
        }}
        result={a}
        annotate={true}
        interactive={true}
        allowDrag={true}
      />
    );

    expect(screen.getByText("+ Apron Hulu ↔")).toBeInTheDocument();
    expect(screen.getByText("+ Apron Hilir ↔")).toBeInTheDocument();

    // 2. With apron > 0: handle badges with dimensions are displayed
    rerender(
      <AnnotatedSketch
        project={{
          ...p,
          seepage: { enabled: true, dCutoffUp: 1.5, dCutoffDown: 2.0, lApronUp: 3.5, lApronDown: 5.0, soilType: "PASIR_SEDANG" },
        }}
        result={a}
        annotate={true}
        interactive={true}
        allowDrag={true}
      />
    );

    expect(screen.getByText(/↔ Lu 3,50m/i)).toBeInTheDocument();
    expect(screen.getByText(/↔ Ld 5,00m/i)).toBeInTheDocument();
  });

  it("triggers onUpdateApron with default length when ghost button is clicked", () => {
    const onUpdateApron = vi.fn();
    render(
      <AnnotatedSketch
        project={{
          ...p,
          seepage: { enabled: true, dCutoffUp: 1.5, dCutoffDown: 2.0, lApronUp: 0, lApronDown: 0, soilType: "PASIR_SEDANG" },
        }}
        result={a}
        annotate={true}
        interactive={true}
        allowDrag={true}
        onUpdateApron={onUpdateApron}
      />
    );

    const ghostUp = screen.getByText("+ Apron Hulu ↔");
    const ghostUpGroup = ghostUp.closest("g[role='button']")!;
    fireEvent.pointerDown(ghostUpGroup, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(ghostUpGroup, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(onUpdateApron).toHaveBeenCalledWith("up", 3.0);

    const ghostDown = screen.getByText("+ Apron Hilir ↔");
    const ghostDownGroup = ghostDown.closest("g[role='button']")!;
    fireEvent.pointerDown(ghostDownGroup, { clientX: 200, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(ghostDownGroup, { clientX: 200, clientY: 100, pointerId: 2 });

    expect(onUpdateApron).toHaveBeenCalledWith("down", 3.0);
  });

  it("triggers onUpdateApron when apron handle is dragged with pointer movement", () => {
    const onUpdateApron = vi.fn();
    render(
      <AnnotatedSketch
        project={{
          ...p,
          seepage: { enabled: true, dCutoffUp: 1.5, dCutoffDown: 2.0, lApronUp: 3.0, lApronDown: 4.0, soilType: "PASIR_SEDANG" },
        }}
        result={a}
        annotate={true}
        interactive={true}
        allowDrag={true}
        onUpdateApron={onUpdateApron}
      />
    );

    const handleUp = screen.getByText(/↔ Lu 3,00m/i);
    const handleUpGroup = handleUp.closest("g[role='button']")!;
    fireEvent.pointerDown(handleUpGroup, { clientX: 100, clientY: 100, pointerId: 1 });
    // Drag to the left (e.g. from 100 to 50)
    fireEvent.pointerMove(handleUpGroup, { clientX: 50, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(handleUpGroup, { clientX: 50, clientY: 100, pointerId: 1 });

    expect(onUpdateApron).toHaveBeenCalledWith("up", expect.any(Number));
  });
});
