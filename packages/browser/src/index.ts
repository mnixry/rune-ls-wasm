import factory from "./lib/rune_languageserver";

export type LSPMessage = { jsonrpc: string } & Record<string, unknown>;

export interface RuneLanguageServerOptions {
  wasmUrl?: URL;
  workerUrl?: URL;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
}

class StdinQueue {
  protected readonly encoder = new TextEncoder();
  protected readonly messages = [] as Uint8Array[];
  protected offset = 0;
  protected closed = false;

  enqueue(message: string) {
    const encoded = this.encoder.encode(message);
    const header = this.encoder.encode(
      `Content-Length: ${encoded.length}\r\n\r\n`,
    );
    this.messages.push(header, encoded);
  }

  dequeueByte(): number | undefined | null {
    if (this.closed) {
      // return null means EOF
      return null;
    }
    const [message = undefined] = this.messages;
    if (message === undefined) {
      // return undefined means EAGAIN
      return undefined;
    }
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
  protected readonly decoder = new TextDecoder();
  protected state: StdoutState = {
    type: "header",
    raw: "",
    headers: Object.create(null),
  };

  constructor(protected readonly subscriber: (message: LSPMessage) => void) {}

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
          this.subscriber(JSON.parse(this.state.raw));
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

export interface RuneLanguageServerEventsMap {
  "lsp-message": CustomEvent<LSPMessage>;
  log: CustomEvent<string>;
  start: CustomEvent<void>;
  exit: CustomEvent<number>;
  abort: CustomEvent<string>;
}

export type RuneLanguageServerEventListener<
  K extends keyof RuneLanguageServerEventsMap,
> = (this: RuneLanguageServer, event: RuneLanguageServerEventsMap[K]) => void;

export class RuneLanguageServer {
  protected readonly eventTarget = new EventTarget();
  protected module?: Awaited<ReturnType<typeof factory>>;
  protected stdin: StdinQueue;
  protected stdout?: StdoutSubscriber;

  constructor(protected readonly options: RuneLanguageServerOptions) {}

  async run() {
    // biome-ignore lint/suspicious/noAssignInExpressions: acknowledged
    const stdin = (this.stdin = new StdinQueue());
    // biome-ignore lint/suspicious/noAssignInExpressions: acknowledged
    const stdout = (this.stdout = new StdoutSubscriber((message) =>
      this.dispatchEvent("lsp-message", message),
    ));

    return await new Promise<void>((resolve, reject) =>
      factory({
        stdin: () => stdin.dequeueByte(),
        stdout: (byte) => stdout.writeByte(byte),
        printErr: (message) => this.dispatchEvent("log", message),
        preRun: (module) => {
          if (this.options.logLevel) {
            module.ENV.RUNE_LOG = this.options.logLevel;
            module.ENV.RUNE_LOG_FILE = RUNE_LOG_FILE;
          }
          this.module = module;
          this.dispatchEvent("start", undefined);
          resolve();
        },
        onExit: (code) => {
          this.dispatchEvent("exit", code);
        },
        onAbort: (reason) => {
          this.dispatchEvent("abort", reason);
        },
      }).catch(reject),
    );
  }

  send(message: LSPMessage) {
    this.stdin?.enqueue(JSON.stringify(message));
  }

  protected dispatchEvent<K extends keyof RuneLanguageServerEventsMap>(
    type: K,
    detail: RuneLanguageServerEventsMap[K]["detail"],
  ) {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
  }

  addEventListener<K extends keyof RuneLanguageServerEventsMap>(
    type: K,
    callback: RuneLanguageServerEventListener<K> | null,
    options?: AddEventListenerOptions | boolean,
  ) {
    this.eventTarget.addEventListener(
      type,
      callback as EventListenerOrEventListenerObject,
      options,
    );
  }

  removeEventListener<K extends keyof RuneLanguageServerEventsMap>(
    type: K,
    callback: RuneLanguageServerEventListener<K> | null,
    options?: EventListenerOptions | boolean,
  ) {
    this.eventTarget.removeEventListener(
      type,
      callback as EventListenerOrEventListenerObject,
      options,
    );
  }
}
