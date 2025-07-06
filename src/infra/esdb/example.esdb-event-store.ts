// src/infra/esdb/esdb-event-store.ts

/*
NOT TESTED

IMPORTANT:
 - snapshot cadence should be optional and configurable, for most aggregates you won’t need snapshots. 500 is an OK number.
 - Snapshots are inline (type === "Snapshot"). Loader scans backwards once, then replays forward from lastRevision+1. Pattern what Greg Young suggested.
 - Cross-stream transactions are avoided. All writes (events + optional snapshot) happen in the same appendToStream call, preserving atomicity with expectedRevision.
 - no RLS, can be replaced by ACL
 - tenancy lock via stream ids
*/

/*
import {
    BACKWARDS,
    END,
    EventData,
    EventStoreDBClient,
    FORWARDS,
    jsonEvent,
    START
} from "@eventstore/db-client";

import { Event, UUID } from "../../core/contracts";
import { EventStorePort } from "../../core/ports";
import { Snapshot } from "../../core/base/aggregate";
import { upcastEvent } from "../../core/shared/event-upcaster";
import { log } from "../../core/logger";

export const SNAPSHOT_EVERY = 2;   // same threshold as before

export class EsdbEventStore implements EventStorePort {
    private client: EventStoreDBClient;

    constructor(connectionString?: string) {
        // ex: "esdb://localhost:2113?tls=false"
        this.client = EventStoreDBClient.connectionString(
            connectionString || process.env.ESDB ?? ""
        );
    }

    /!* ---------- helpers ---------- *!/

    /!** deterministic stream id: tenant-{t}-{type}-{id} *!/
    private stream(tenant: UUID, type: string, id: UUID): string {
        return `tenant-${tenant}-${type}-${id}`;
    }

    private toJson(e: Event): EventData {
        return jsonEvent({
            id: e.id,
            type: e.type,
            data: e.payload,
            metadata: { ...e.metadata, schemaVersion: e.metadata?.schemaVersion ?? 1 }
        });
    }

    async append(
        tenant: UUID,
        aggregateType: string,
        aggregateId: UUID,
        events: Event[],
        expectedVersion: number,
        // preserve optional snapshot param for signature compatibility
        snapshot?: Snapshot<any>
    ): Promise<void> {
        if (!events.length && !snapshot) return;

        const streamId = this.stream(tenant, aggregateType, aggregateId);
        const batch: EventData[] = events.map(this.toJson);

        // inline snapshot if threshold crossed or caller provided an explicit snapshot
        const nextVersion = expectedVersion + events.length;
        const needSnapshot =
            snapshot ||
            (SNAPSHOT_EVERY > 0 &&
                Math.floor(nextVersion / SNAPSHOT_EVERY) >
                Math.floor(expectedVersion / SNAPSHOT_EVERY));

        if (needSnapshot) {
            const snap = snapshot ?? {
                id: aggregateId,
                version: nextVersion,
                state: events[events.length - 1].payload, // fallback
                schemaVersion: 1,
                createdAt: new Date()
            };
            batch.push(
                jsonEvent({
                    type: "Snapshot",
                    data: snap.state,
                    metadata: {
                        lastRevision: nextVersion,
                        schemaVersion: snap.schemaVersion
                    }
                })
            );
        }

        await this.client.appendToStream(streamId, batch, {
            expectedRevision: BigInt(expectedVersion)
        });
    }

    async load(
        tenant: UUID,
        aggregateType: string,
        aggregateId: UUID,
        fromVersion = 0
    ): Promise<{ events: Event[]; version: number } | null> {
        const streamId = this.stream(tenant, aggregateType, aggregateId);

        // fast path: if fromVersion == 0, attempt latest snapshot first
        let startFrom = BigInt(fromVersion);
        if (fromVersion === 0) {
            const snap = await this.loadSnapshot(tenant, aggregateType, aggregateId);
            if (snap) {
                startFrom = BigInt(snap.version + 1);
            }
        }

        const rs = this.client.readStream(streamId, {
            fromRevision: startFrom,
            direction: FORWARDS
        });

        const evts: Event[] = [];
        let lastRevision = Number(startFrom) - 1;

        for await (const { event, streamRevision } of rs) {
            // ignore snapshots when replaying
            if (event.type.startsWith("Snapshot")) continue;

            evts.push({
                id: event.id,
                tenant_id: tenant,
                aggregateType,
                aggregateId,
                type: event.type,
                payload: upcastEvent(
                    event.type,
                    event.data as any,
                    (event.metadata as any)?.schemaVersion ?? 1
                ),
                version: Number(streamRevision),
                metadata: event.metadata as any
            });
            lastRevision = Number(streamRevision);
        }

        if (evts.length === 0 && fromVersion === 0 && startFrom === START)
            return null;

        return { events: evts, version: Math.max(lastRevision, fromVersion) };
    }

    async loadSnapshot(
        tenant: UUID,
        aggregateType: string,
        aggregateId: UUID
    ): Promise<{ version: number; state: any; schemaVersion: number } | null> {
        const streamId = this.stream(tenant, aggregateType, aggregateId);

        const snapIter = this.client.readStream(streamId, {
            direction: BACKWARDS,
            fromRevision: END,
            maxCount: 1,
            filter: { eventTypePrefix: "Snapshot" }
        });

        const result = await snapIter.next();
        if (result.done || !result.value?.event) return null;

        const evt = result.value.event;
        return {
            version: (evt.metadata as any).lastRevision,
            state: evt.data,
            schemaVersion: (evt.metadata as any).schemaVersion ?? 1
        };
    }

    async close(): Promise<void> {
        // no-op: the client holds a single HTTP/2 channel that closes on GC,
        // but explicit shutdown keeps tests deterministic
        try {
            // private API until v6; ignore if unavailable
            await this.client?.dispose?.();
        } catch (e) {
            log()?.warn("ESDB client dispose failed", { error: e });
        }
    }
}
*/
