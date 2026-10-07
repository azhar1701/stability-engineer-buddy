import { describe, it, expect, beforeEach } from "vitest";
import { useProjectHistoryStore } from "@/lib/useProjectHistory";
import type { Project } from "@/lib/engine/types";
import { uatSample } from "@/lib/engine/defaults";

describe("useProjectHistoryStore", () => {
  const pId = "test-proj-1";

  beforeEach(() => {
    useProjectHistoryStore.getState().clear(pId);
  });

  it("initializes with empty history stack", () => {
    const store = useProjectHistoryStore.getState();
    expect(store.canUndo(pId)).toBe(false);
    expect(store.canRedo(pId)).toBe(false);
  });

  it("pushes snapshot and enables undo", () => {
    const store = useProjectHistoryStore.getState();
    const proj1 = uatSample();

    store.pushSnapshot(pId, proj1);

    expect(useProjectHistoryStore.getState().canUndo(pId)).toBe(true);
    expect(useProjectHistoryStore.getState().canRedo(pId)).toBe(false);
  });

  it("handles undo and redo sequence correctly", () => {
    const proj1 = uatSample();
    const proj2: Project = {
      ...proj1,
      components: [
        ...proj1.components,
        {
          id: "new-comp",
          name: "Tambahan",
          shape: "PERSEGI",
          material: "Beton bertulang",
          x0: 1,
          z0: 0,
          b1: 2,
          b2: 0,
          h: 1,
        },
      ],
    };

    // Step 1: Push proj1 snapshot before updating to proj2
    useProjectHistoryStore.getState().pushSnapshot(pId, proj1);

    // Step 2: Undo with proj2 as current
    const restored1 = useProjectHistoryStore.getState().undo(pId, proj2);
    expect(restored1).not.toBeNull();
    expect(restored1?.components.length).toBe(proj1.components.length);
    expect(useProjectHistoryStore.getState().canUndo(pId)).toBe(false);
    expect(useProjectHistoryStore.getState().canRedo(pId)).toBe(true);

    // Step 3: Redo with restored1 as current
    const restored2 = useProjectHistoryStore.getState().redo(pId, restored1!);
    expect(restored2).not.toBeNull();
    expect(restored2?.components.length).toBe(proj2.components.length);
    expect(useProjectHistoryStore.getState().canUndo(pId)).toBe(true);
    expect(useProjectHistoryStore.getState().canRedo(pId)).toBe(false);
  });

  it("does not push identical consecutive snapshots", () => {
    const proj = uatSample();
    const store = useProjectHistoryStore.getState();

    store.pushSnapshot(pId, proj);
    store.pushSnapshot(pId, proj);

    const stack = useProjectHistoryStore.getState().stacks[pId];
    expect(stack?.past.length).toBe(1);
  });

  it("clears history on request", () => {
    const proj = uatSample();
    const store = useProjectHistoryStore.getState();

    store.pushSnapshot(pId, proj);
    expect(store.canUndo(pId)).toBe(true);

    store.clear(pId);
    expect(store.canUndo(pId)).toBe(false);
    expect(useProjectHistoryStore.getState().stacks[pId]).toBeUndefined();
  });
});
