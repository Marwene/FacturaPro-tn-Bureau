import type { QueryClient, QueryKey } from "@tanstack/react-query"

export async function optimisticUpdate<T>(
  qc: QueryClient,
  queryKey: QueryKey,
  updater: (old: T[]) => T[]
) {
  await qc.cancelQueries({ queryKey })
  const previous = qc.getQueryData<T[]>(queryKey)
  if (previous) {
    qc.setQueryData(queryKey, updater(previous))
  }
  return { previous }
}

export function optimisticArrayUpdate<T extends { id: string }>(
  items: T[],
  id: string,
  changes: Partial<T>
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...changes } : item))
}

export function optimisticArrayDelete<T extends { id: string }>(
  items: T[],
  id: string
): T[] {
  return items.filter((item) => item.id !== id)
}

export function rollbackOptimistic<T>(
  qc: QueryClient,
  queryKey: QueryKey,
  context: { previous?: T[] } | undefined
) {
  if (context?.previous) {
    qc.setQueryData(queryKey, context.previous)
  }
}
