/**
 * Unit tests exercise the product itself, so they begin past the front door: the intro is
 * marked finished for every test file. The landing page and the wizard have their own checks
 * in the e2e smoke, against a real browser and a really empty save.
 */
// Phase M (REQ-57): the fake IndexedDB must exist before Dexie loads — first import wins.
import './helpers/fake-idb';
import { useStore } from '../src/data/store';

// REQ-41: the landing is the front door on every fresh load; the unit tests live inside the
// studio, so both in-memory flags say the door was passed (the smoke still walks the real door).
useStore.setState({ introDone: true, doorPassed: true });
