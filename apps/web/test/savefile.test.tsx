/**
 * Round seventeen (security): the save file you download never carries your model keys or
 * integration tokens — they stay on this device. The on-device save keeps them (the product
 * is browser-only by design); only the export is scrubbed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { savePayload } from '../src/lib/savefile';
import { useStore } from '../src/data/store';

beforeEach(() => {
  useStore.setState({
    agents: [
      { id: 'p-1', name: 'Aria', model: { provider: 'openai', model: 'gpt', key: 'sk-very-secret' } },
      { id: 'p-2', name: 'Sam', model: null },
    ] as never,
    integrations: [
      { id: 'ix-1', kind: 'notion', label: 'Notion', repo: 'https://github.com/x/y', secret: 'tok-1', status: 'idle', note: '', tools: [] },
    ] as never,
  });
});

describe('the export file (round seventeen)', () => {
  it('scrubs model keys and integration tokens, keeping everything else', () => {
    const payload = savePayload() as {
      agents: { id: string; model: { key: string } | null }[];
      integrations: { id: string; secret: string }[];
    };
    expect(payload.agents.find((a) => a.id === 'p-1')?.model?.key).toBe('');
    expect(payload.agents.find((a) => a.id === 'p-2')?.model).toBeNull();
    expect(payload.integrations[0]?.secret).toBe('');
    expect(JSON.stringify(payload)).not.toContain('sk-very-secret');
    expect(JSON.stringify(payload)).not.toContain('tok-1');
  });
});
