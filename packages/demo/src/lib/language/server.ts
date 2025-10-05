import {
  LSPClient,
  languageServerExtensions,
  type Transport,
} from "@codemirror/lsp-client";
import {
  RuneLanguageServer,
  type RuneLanguageServerOptions,
} from "@runels-wasm/browser";

class RuneEmscriptenServerTransport implements Transport {
  readonly server: RuneLanguageServer;
  protected readonly subscribers = new Set<(value: string) => void>();

  constructor(options: RuneLanguageServerOptions) {
    this.server = new RuneLanguageServer(options);
    this.server.subscribe((message) => this.broadcast(JSON.stringify(message)));
  }

  protected broadcast(message: string) {
    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }

  send(message: string) {
    const parsed = JSON.parse(message);
    console.log("send", parsed);
    // if ("method" in parsed && parsed.method === "initialize") {
    //   setDeep(parsed, "params.capabilities.general.positionEncodings", [
    //     "utf-8",
    //   ]);
    // }
    this.server.send(parsed);
  }

  subscribe(handler: (value: string) => void) {
    this.subscribers.add(handler);
  }

  unsubscribe(handler: (value: string) => void): void {
    this.subscribers.delete(handler);
  }
}

export async function createRuneLanguageServer(
  options: RuneLanguageServerOptions,
) {
  const transport = new RuneEmscriptenServerTransport(options);
  transport.server.run();
  const client = new LSPClient({ extensions: languageServerExtensions() });
  client.connect(transport);
  return { client, server: transport.server };
}
