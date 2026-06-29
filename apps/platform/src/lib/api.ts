import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkflowDefinition } from '@platform/core'

const BASE = '/mock-api'

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function jsend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => jget<WorkflowDefinition[]>('/workflows'),
  })
}

export function useWorkflow(id: string | null) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => jget<WorkflowDefinition>(`/workflows/${id}`),
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => jsend<WorkflowDefinition>('POST', '/workflows', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useSaveWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; data: Partial<WorkflowDefinition> }) =>
      jsend<WorkflowDefinition>('PUT', `/workflows/${input.id}`, input.data),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      qc.setQueryData(['workflow', wf.id], wf)
    },
  })
}

export function usePublishWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jsend<WorkflowDefinition>('POST', `/workflows/${id}/publish`),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      qc.setQueryData(['workflow', wf.id], wf)
    },
  })
}
