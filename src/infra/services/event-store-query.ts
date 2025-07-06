import { EventStorePort, EventStoreQueryPort } from '../../core/ports';
import { UUID } from '../../core/contracts';

export class EventStoreQueryAdapter implements EventStoreQueryPort {
  constructor(private readonly store: EventStorePort) {}
  async existsAll(type: string, ids: UUID[], tenant: UUID) {
    for (const id of ids) if (!(await this.store.load(tenant, type, id))) return false;
    return true;
  }
  async existsOne(type: string, id: UUID, tenant: UUID) {
    return !!(await this.store.load(tenant, type, id));
  }
}
