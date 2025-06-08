import { describe, it, expect } from 'vitest';
import { makeEvent } from '../src/mocks/factories/event.factory';
import { makeCommand } from '../src/mocks/factories/command.factory';
import { makeTrace } from '../src/mocks/factories/trace.factory';
import { makeLog } from '../src/mocks/factories/log.factory';

// ISO 8601 timestamp regex pattern
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

describe('Factory timestamp formats', () => {
  it('event factory should use ISO 8601 timestamps', () => {
    const event = makeEvent();
    expect(event.metadata.timestamp).toMatch(ISO_8601_REGEX);
    expect(event.payload.timestamp).toMatch(ISO_8601_REGEX);
  });

  it('command factory should use ISO 8601 timestamps', () => {
    const command = makeCommand();
    expect(command.metadata.timestamp).toMatch(ISO_8601_REGEX);
    expect(command.payload.timestamp).toMatch(ISO_8601_REGEX);
    expect(command.createdAt).toMatch(ISO_8601_REGEX);
  });

  it('trace factory should use ISO 8601 timestamps', () => {
    const trace = makeTrace();
    expect(trace.timestamp).toMatch(ISO_8601_REGEX);
  });

  it('log factory should use ISO 8601 timestamps', () => {
    const log = makeLog();
    expect(log.timestamp).toMatch(ISO_8601_REGEX);
  });
});