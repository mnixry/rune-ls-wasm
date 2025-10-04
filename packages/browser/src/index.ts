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
    const encoded = this.encoder.encode(message);
    const header = this.encoder.encode(
      `Content-Length: ${encoded.length}\r\n\r\n`,
    );
    this.messages.push(header, encoded);
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

type StdoutState =
  | { type: "content"; raw: string; remaining: number }
  | { type: "header"; raw: string; headers: Record<string, string> };

class StdoutSubscriber {
  protected readonly subscribers = new Set<Subscriber>();
  protected readonly decoder = new TextDecoder();
  protected state: StdoutState = {
    type: "header",
    raw: "",
    headers: Object.create(null),
  };

  constructor(protected readonly subscriber: Subscriber) {}

  writeByte(byte: number) {
    const decoded = this.decoder.decode(new Uint8Array([byte]));
    this.state.raw += decoded;
    switch (this.state.type) {
      case "header":
        if (decoded === "\n") {
          const [full, name, value] =
            this.state.raw.match(/^([\w-]+):\s?(.*)\r\n$/) ?? [];
          if (full) {
            // is header line, write header
            this.state.headers[name.toLowerCase()] = value;
            this.state.raw = "";
          } else {
            // is delimiter line
            const contentLength = Number.parseInt(
              this.state.headers["content-length"] ?? "0",
              10,
            );
            this.state = { type: "content", remaining: contentLength, raw: "" };
          }
        }
        break;
      case "content":
        this.state.remaining -= decoded.length;
        if (this.state.remaining <= 0) {
          this.subscriber(this.state.raw);
          this.state = {
            type: "header",
            raw: "",
            headers: Object.create(null),
          };
        }
        break;
    }
  }
}

const RUNE_LOG_FILE = "/dev/stderr";

export class RuneLanguageServer {
  protected module?: Awaited<ReturnType<typeof factory>>;
  protected readonly subscribers = new Set<Subscriber>();
  protected stdin?: StdinQueue;
  protected stdout?: StdoutSubscriber;
  protected exitCode?: number;
  protected abortReason?: string;

  constructor(protected readonly options: RuneLanguageServerOptions) {}

  get state() {
    return this.module
      ? this.stdin && this.stdout
        ? this.abortReason !== undefined
          ? ({ state: "aborted", abortReason: this.abortReason } as const)
          : this.exitCode !== undefined
            ? ({ state: "exited", exitCode: this.exitCode } as const)
            : ({ state: "running" } as const)
        : this.stdin && this.stdout
          ? ({ state: "not-running" } as const)
          : ({ state: "initialized" } as const)
      : ({ state: "not-initialized" } as const);
  }

  async run() {
    const stdin = new StdinQueue();
    this.stdin = stdin;
    const stdout = new StdoutSubscriber((message) => this.broadcast(message));
    this.stdout = stdout;

    return await new Promise<void>((resolve, reject) =>
      factory({
        environment: Object.assign(
          Object.create(null),
          this.options.logLevel && {
            RUNE_LOG: this.options.logLevel,
            RUNE_LOG_FILE,
          },
        ),
        stdin: () => stdin.dequeueByte(),
        stdout: (byte) => stdout.writeByte(byte),
        stderr: (byte) => console.error(byte),
        preRun: (module) => {
          this.module = module;
          this.exitCode = undefined;
          this.abortReason = undefined;
          resolve();
        },
        onExit: (code) => {
          this.exitCode = code;
          console.log("onExit", code);
          reject(new Error(`RuneLanguageServer exited with code ${code}`));
        },
        onAbort: (reason) => {
          this.abortReason = reason;
          console.log("onAbort", reason);
          reject(new Error(`RuneLanguageServer aborted with reason ${reason}`));
        },
      }),
    );
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
