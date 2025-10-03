import factory from "./lib/rune_languageserver";

type Subscriber = (message: string) => void;

export interface RuneLanguageServerOptions {
  wasmUrl?: URL;
  workerUrl?: URL;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
  subscribeErrorHandler?: (handler: Subscriber, error: unknown) => void;
}

class StdinQueue {
  protected readonly encoder = new TextEncoder();
  protected readonly messages = [] as Uint8Array[];
  protected offset = 0;

  enqueue(message: string) {
    this.messages.push(this.encoder.encode(message));
  }

  dequeueByte(): number | null {
    const [message = null] = this.messages;
    if (message === null) return null;
    if (this.offset >= message.length) {
      this.messages.shift();
      this.offset = 0;
      return this.dequeueByte();
    }
    return message[this.offset++];
  }
}

class StdoutSubscriber {
  protected readonly subscribers = new Set<Subscriber>();
  protected readonly decoder = new TextDecoder();
  protected message = "";

  constructor(protected readonly subscriber: Subscriber) {}

  writeByte(byte: number) {
    const decoded = this.decoder.decode(new Uint8Array([byte]));
    if (decoded) this.message += decoded;
    if (decoded.endsWith("\n")) this.flush();
  }

  protected flush() {
    this.subscriber(this.message);
    this.message = "";
  }
}

const RUNE_LOG_FILE = "/tmp/rune.log";

export class RuneLanguageServer {
  protected module?: Awaited<ReturnType<typeof factory>>;
  protected readonly subscribers = new Set<Subscriber>();
  protected stdin?: StdinQueue;
  protected stdout?: StdoutSubscriber;
  protected exitCode?: number;
  protected abortReason?: string;

  constructor(protected readonly options: RuneLanguageServerOptions) {}

  get state() {
    if (!this.module) return { state: "not-initialized" };
    if (!(this.stdin && this.stdout)) return { state: "not-running" };
    if (this.abortReason !== undefined)
      return { state: "aborted", abortReason: this.abortReason };
    if (this.exitCode !== undefined)
      return { state: "exited", exitCode: this.exitCode };
  }

  async run() {
    const stdin = (this.stdin = new StdinQueue());
    const stdout = (this.stdout = new StdoutSubscriber(this.broadcast));
    await factory({
      environment: Object.assign(
        Object.create(null),
        this.options.logLevel && {
          RUNE_LOG: this.options.logLevel,
          RUNE_LOG_FILE,
        }
      ),
      stdin: () => stdin.dequeueByte(),
      stdout: (byte) => stdout.writeByte(byte),
      preRun: (module) => {
        this.module = module;
        this.exitCode = undefined;
        this.abortReason = undefined;
      },
      onExit: (code) => {
        this.exitCode = code;
      },
      onAbort: (reason) => {
        this.abortReason = reason;
      },
    });
  }

  send(message: string) {
    this.stdin?.enqueue(message);
  }

  subscribe(handler: Subscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  get logs() {
    return this.module?.FS.readFile(RUNE_LOG_FILE, { encoding: "utf8" });
  }

  protected broadcast(message: string) {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(message);
      } catch (error) {
        this.options.subscribeErrorHandler?.(subscriber, error);
      }
    }
  }
}
