/**
 * Unit tests exercise the product itself, so they begin past the front door: the intro is
 * marked finished for every test file. The landing page and the wizard have their own checks
 * in the e2e smoke, against a real browser and a really empty save.
 */
import { useStore } from '../src/data/store';

useStore.setState({ introDone: true });
