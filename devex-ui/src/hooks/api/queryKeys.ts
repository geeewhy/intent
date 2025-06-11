//devex-ui/src/hooks/api/queryKeys.ts

export const eventsKeys = {
  all: ['events'] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  list: (tenant: string, limit: number) => [...eventsKeys.lists(), tenant, limit] as const,
  details: () => [...eventsKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
}

export const commandsKeys = {
  all: ['commands'] as const,
  lists: () => [...commandsKeys.all, 'list'] as const,
  list: (tenant: string, limit: number) => [...commandsKeys.lists(), tenant, limit] as const,
}

export const logsKeys = {
  all: ['logs'] as const,
  lists: () => [...logsKeys.all, 'list'] as const,
  list: (tenant: string, limit: number) => [...logsKeys.lists(), tenant, limit] as const,
}

export const rolesKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesKeys.all, 'list'] as const,
  list: (domain: string) => [...rolesKeys.lists(), domain] as const,
}
