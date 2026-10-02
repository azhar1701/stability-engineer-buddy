import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useStore } from "./store";
import { analyze } from "./engine/compute";
import type { Project } from "./engine/types";

export function useProject() {
  const { id } = useParams({ strict: false }) as { id: string };
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const updateStore = useStore((s) => s.update);
  const result = useMemo(() => (project ? analyze(project) : null), [project]);
  const update = (fn: (p: Project) => Project) => updateStore(id, fn);
  const set = <K extends keyof Project>(k: K, v: Project[K]) => update((p) => ({ ...p, [k]: v }));
  const patch = <K extends keyof Project>(k: K, v: Partial<Project[K]>) => update((p) => ({ ...p, [k]: { ...(p[k] as object), ...(v as object) } }));
  return { project: project!, result: result!, update, set, patch };
}
