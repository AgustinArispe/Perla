export class ScanQueue {
  private tail: Promise<void> = Promise.resolve();
  private generation = 0;
  pending = 0;
  constructor(
    private readonly process: (code: string, current: () => boolean) => Promise<void>,
    private readonly changed: () => void = () => {},
  ) {}
  enqueue(code: string): Promise<void> {
    const generation = this.generation;
    this.pending++;
    this.changed();
    const job = this.tail.then(async () => {
      try {
        if (generation === this.generation)
          await this.process(code, () => generation === this.generation);
      } finally {
        this.pending--;
        this.changed();
      }
    });
    this.tail = job.catch(() => {});
    return job;
  }
  async flush(): Promise<void> {
    await this.tail;
  }
  cancel(): void {
    this.generation++;
  }
}
