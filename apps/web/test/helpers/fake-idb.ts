/**
 * jsdom ships no IndexedDB. This module is imported FIRST by the test setup so the fake
 * exists on every realm before Dexie's module initialisation snapshots its dependencies.
 */
import { indexedDB as fakeIdb, IDBKeyRange as fakeKeyRange } from 'fake-indexeddb';

for (const realm of [globalThis, typeof window !== 'undefined' ? window : null, typeof self !== 'undefined' ? self : null]) {
  if (realm) {
    (realm as { indexedDB?: unknown }).indexedDB = fakeIdb;
    (realm as { IDBKeyRange?: unknown }).IDBKeyRange = fakeKeyRange;
  }
}
