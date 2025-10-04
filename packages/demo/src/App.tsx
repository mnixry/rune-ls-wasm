import { Editor } from "./components/editor";

function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">Rune Language Server Demo</h1>
        <p className="mt-1 text-sm">
          Try the Rune language server with Monaco editor
        </p>
      </header>
      <main className="flex-1 overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}

export default App;
