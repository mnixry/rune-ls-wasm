{
  rust-bin,
  callPackage,
  emscripten,
  prettier,
  inputs,
}:
let
  target = "wasm32-unknown-emscripten";
  rustPackage = rust-bin.nightly.latest;
  rust = rustPackage.default.override {
    extensions = [ "rust-src" ];
    targets = [ target ];
  };
  inherit (inputs) naersk;
  inherit
    (callPackage naersk {
      cargo = rust;
      rustc = rust;
    })
    buildPackage
    ;
in
buildPackage {
  src = inputs.self;
  additionalCargoLock = "${rust}/lib/rustlib/src/rust/library/Cargo.lock";

  doCheck = false;
  nativeBuildInputs = [
    emscripten
    prettier
  ];

  cargoBuildOptions = prev: [ "--target=${target}" ] ++ prev;

  copyBins = false;
  copyLibs = false;
  postInstall = ''
    mkdir -p $out/lib
    install -Dm 755 ./target/${target}/release/rune-languageserver.js $out/lib/rune_languageserver.js
    install -Dm 755 ./target/${target}/release/rune_languageserver.wasm $out/lib/rune_languageserver.wasm
    prettier $out/lib/rune_languageserver.js --write
  '';

  passthru = {
    inherit target rust;
  };
}
