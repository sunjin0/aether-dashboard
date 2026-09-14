const guards = new Map<string, () => Promise<boolean>>();

export function registerRouteLeaveGuard(path: string, guard: () => Promise<boolean>) {
  guards.set(path, guard);
  return () => {
    if (guards.get(path) === guard) guards.delete(path);
  };
}

export function allowRouteLeave(path: string): boolean | Promise<boolean> {
  return guards.get(path)?.() ?? true;
}
