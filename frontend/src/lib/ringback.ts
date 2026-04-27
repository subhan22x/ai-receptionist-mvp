// Plays a ringback audio asset and reports when it finishes.
// `onFinished` fires exactly once: on natural end, load/play error, or stop().

export type RingbackEnd = "ended" | "error" | "stopped";

export class Ringback {
  private audio: HTMLAudioElement | null = null;
  private finished = false;
  private onFinished: ((reason: RingbackEnd) => void) | null = null;

  start(src: string, onFinished: (reason: RingbackEnd) => void): void {
    if (this.audio) return;
    this.onFinished = onFinished;

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.onended = () => this.finish("ended");
    audio.onerror = () => this.finish("error");
    this.audio = audio;

    audio.play().catch(() => this.finish("error"));
  }

  stop(): void {
    if (this.audio) {
      try {
        this.audio.pause();
      } catch {
        /* noop */
      }
      this.audio.src = "";
      this.audio = null;
    }
    this.finish("stopped");
  }

  private finish(reason: RingbackEnd) {
    if (this.finished) return;
    this.finished = true;
    const cb = this.onFinished;
    this.onFinished = null;
    if (cb) cb(reason);
  }
}
