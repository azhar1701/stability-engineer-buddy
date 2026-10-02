import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { Project } from "./engine/types";
import { newProject, uatSample, uid } from "./engine/defaults";

interface State {
  projects: Project[];
  create: (p?: Project) => string;
  update: (id: string, fn: (p: Project) => Project) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string;
  importMany: (ps: Project[]) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [],
      create: (p) => { const np = p ?? newProject(); set({ projects: [np, ...get().projects] }); return np.id; },
      update: (id, fn) => set({ projects: get().projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)) }),
      remove: (id) => set({ projects: get().projects.filter((p) => p.id !== id) }),
      duplicate: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return "";
        const c = { ...structuredClone(src), id: uid(), name: src.name + " (salinan)", updatedAt: Date.now() };
        set({ projects: [c, ...get().projects] });
        return c.id;
      },
      importMany: (ps) => set({ projects: [...ps.map((p) => ({ ...newProject(p.type), ...p, id: uid() })), ...get().projects] }),
    }),
    { name: "stabilitas-bangunan-air-v1", skipHydration: true },
  ),
);

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).then(() => setH(true));
  }, []);
  return h;
}

export { uatSample, newProject };
