# rune-ls-wasm

Browser-ready WebAssembly build of the Rune language server, plus a small TypeScript wrapper (`@runels-wasm/browser`) and a React demo. This lets you run the Rune LSP fully in the browser (no native binaries) and wire it to editors like CodeMirror.

## Demo

The Demo is available at Cloudflare Pages: <https://rune-ls-wasm-demo.pages.dev/>.

## Limitations

- No full support for every standard library features, some packages (e.g, `http`, `process` and `signal`) are not ported since their implementations are not possible to port to WebAssembly and I can't find a trivial method to separate the LSP context from actual code execution.
- Hard to integrate with third-party binds since it requires customize the `rune-languageserver` crate to support the bind and may faces same problems as the non-portable standard library features.

## Build (with Nix)

Prerequisites: Nix with flakes enabled.

- Build the WebAssembly language server artifact:

```bash
nix build .#rune-ls-wasm
```

Outputs:

- `result/lib/rune_languageserver.js`
- `result/lib/rune_languageserver.wasm`

- Build the demo site (static assets):

```bash
nix build .#demo
```

The built site will be in `result/`. Serve it with headers that include COOP/COEP Since we are using SharedArrayBuffer for PThreads support in Emscripten. Example (Caddy):

```bash
caddy file-server --root ./result --listen :5173 \
  --header "Cross-Origin-Opener-Policy: same-origin" \
  --header "Cross-Origin-Embedder-Policy: require-corp"
```

## Project Structure

- `pkgs/`: Nix scripts for building the Rune Language Server to WebAssembly with minor patches.
- `packages/browser/`: TypeScript wrapper exposing `RuneLanguageServer` for the browser.
- `packages/demo/`: React + Vite demo wired to CodeMirror and the in-browser LSP.

## License

This project is licensed under the MIT license. See [`LICENSE`](./LICENSE) for details.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
