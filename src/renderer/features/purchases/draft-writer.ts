import type {
  PurchaseDraftBody,
  PurchaseDraftRecord,
  PurchaseDraftSaveInput,
} from '../../../shared/purchases';
import type { Result } from '../../../shared/contracts';

export class PurchaseDraftWriter {
  revision = 0;
  error = '';
  private latest: PurchaseDraftBody | null = null;
  private stored = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;

  constructor(
    private readonly backend: {
      saveDraft(input: PurchaseDraftSaveInput): Promise<Result<PurchaseDraftRecord>>;
      getDraft(): Promise<Result<PurchaseDraftRecord | null>>;
    },
    private readonly changed: () => void = () => {},
  ) {}

  get unsaved(): boolean {
    return this.latest !== null && JSON.stringify(this.latest) !== this.stored;
  }

  reset(record: PurchaseDraftRecord | null): void {
    this.revision = record?.revision ?? 0;
    this.latest = record?.body ?? null;
    this.stored = record ? JSON.stringify(record.body) : '';
    this.error = '';
    this.changed();
  }

  update(body: PurchaseDraftBody): void {
    this.latest = body;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush().catch(() => {}), 500);
    this.changed();
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (!this.unsaved) return Promise.resolve();
    this.running = (async () => {
      try {
        while (this.latest && this.unsaved) {
          const body = this.latest;
          const result = await this.backend.saveDraft({
            body,
            expectedRevision: this.revision,
          });
          let saved: PurchaseDraftRecord;
          if (result.ok) saved = result.value;
          else {
            const recovery = await this.backend.getDraft();
            if (
              recovery.ok &&
              recovery.value &&
              JSON.stringify(recovery.value.body) === JSON.stringify(body)
            )
              saved = recovery.value;
            else throw new Error(result.error.message);
          }
          this.revision = saved.revision;
          this.stored = JSON.stringify(saved.body);
          this.error = '';
          this.changed();
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se guardó el borrador.';
        this.changed();
        throw error;
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  dispose(): void {
    clearTimeout(this.timer);
  }
}
