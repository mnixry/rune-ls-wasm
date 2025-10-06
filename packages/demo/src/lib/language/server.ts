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
    this.server.addEventListener("lsp-message", (event) =>
      this.broadcast(JSON.stringify(event.detail)),
    );
  }

  protected broadcast(message: string) {
    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }

  send(message: string) {
    const parsed = JSON.parse(message);
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
  await transport.server.run();
  const client = new LSPClient({ extensions: languageServerExtensions() });
  client.connect(transport);
  return { client, server: transport.server };
}
