import { create } from "zustand";
import { useEffect, useCallback } from "react";
import type { Project } from "./engine/types";
import { useProject } from "./useProject";

interface HistoryStack {
  past: Project[];
  future: Project[];
}

interface ProjectHistoryStore {
  stacks: Record<string, HistoryStack>;
  pushSnapshot: (projectId: string, current: Project) => void;
  undo: (projectId: string, current: Project) => Project | null;
  redo: (projectId: string, current: Project) => Project | null;
  canUndo: (projectId: string) => boolean;
  canRedo: (projectId: string) => boolean;
  clear: (projectId: string) => void;
}

const MAX_HISTORY = 30;

export const useProjectHistoryStore = create<ProjectHistoryStore>((set, get) => ({
  stacks: {},

  pushSnapshot: (projectId, current) => {
    const stack = get().stacks[projectId] ?? { past: [], future: [] };
    const last = stack.past[stack.past.length - 1];

    // Avoid pushing identical snapshot
    if (last && JSON.stringify(last.components) === JSON.stringify(current.components) &&
        last.B === current.B && JSON.stringify(last.seepage) === JSON.stringify(current.seepage)) {
      return;
    }

    const newPast = [...stack.past, structuredClone(current)].slice(-MAX_HISTORY);
    set({
      stacks: {
        ...get().stacks,
        [projectId]: {
          past: newPast,
          future: [], // New action invalidates redo stack
        },
      },
    });
  },

  undo: (projectId, current) => {
    const stack = get().stacks[projectId];
    if (!stack || stack.past.length === 0) return null;

    const previous = stack.past[stack.past.length - 1]!;
    const newPast = stack.past.slice(0, -1);
    const newFuture = [structuredClone(current), ...stack.future].slice(0, MAX_HISTORY);

    set({
      stacks: {
        ...get().stacks,
        [projectId]: {
          past: newPast,
          future: newFuture,
        },
      },
    });

    return previous;
  },

  redo: (projectId, current) => {
    const stack = get().stacks[projectId];
    if (!stack || stack.future.length === 0) return null;

    const next = stack.future[0]!;
    const newFuture = stack.future.slice(1);
    const newPast = [...stack.past, structuredClone(current)].slice(-MAX_HISTORY);

    set({
      stacks: {
        ...get().stacks,
        [projectId]: {
          past: newPast,
          future: newFuture,
        },
      },
    });

    return next;
  },

  canUndo: (projectId) => {
    const stack = get().stacks[projectId];
    return !!stack && stack.past.length > 0;
  },

  canRedo: (projectId) => {
    const stack = get().stacks[projectId];
    return !!stack && stack.future.length > 0;
  },

  clear: (projectId) => {
    const newStacks = { ...get().stacks };
    delete newStacks[projectId];
    set({ stacks: newStacks });
  },
}));

/**
 * Hook to attach undo/redo capabilities to current project
 */
export function useProjectHistory() {
  const { project, update } = useProject();
  const projectId = project?.id ?? "";

  const pushSnapshot = useProjectHistoryStore((s) => s.pushSnapshot);
  const undoStore = useProjectHistoryStore((s) => s.undo);
  const redoStore = useProjectHistoryStore((s) => s.redo);
  const canUndo = useProjectHistoryStore((s) => (projectId ? s.canUndo(projectId) : false));
  const canRedo = useProjectHistoryStore((s) => (projectId ? s.canRedo(projectId) : false));

  const recordAction = useCallback(() => {
    if (project) {
      pushSnapshot(projectId, project);
    }
  }, [project, projectId, pushSnapshot]);

  const handleUndo = useCallback(() => {
    if (!project) return;
    const restored = undoStore(projectId, project);
    if (restored) {
      update(() => restored);
    }
  }, [project, projectId, undoStore, update]);

  const handleRedo = useCallback(() => {
    if (!project) return;
    const restored = redoStore(projectId, project);
    if (restored) {
      update(() => restored);
    }
  }, [project, projectId, redoStore, update]);

  // Global Ctrl+Z / Ctrl+Y keyboard shortcut listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!project) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

      const tag = ((document.activeElement as HTMLElement)?.tagName || "").toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;

      // Allow native undo inside active text inputs
      if (isInput) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project, handleUndo, handleRedo]);

  return {
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
    recordAction,
  };
}
