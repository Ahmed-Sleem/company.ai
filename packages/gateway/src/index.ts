/** @company/gateway — the only door to a provider. */
export * from './types.js';
export { createGateway, type Gateway } from './gateway.js';
export { mockAdapter, openAiCompatAdapter } from './adapters.js';
export { dbRegistry } from './registry.js';
