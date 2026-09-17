import type { BochaApi } from '../shared/contracts';
declare global {
  interface Window {
    bocha?: BochaApi;
  }
}
