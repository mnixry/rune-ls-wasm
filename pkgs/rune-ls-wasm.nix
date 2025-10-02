{
  rust-bin,
  makeRustPlatform,
  binaryen,
  inputs,
}:
let
  target = "wasm32-wasip1-threads";
  rust = rust-bin.stable.latest.default.override {
    extensions = [ "rust-src" ];
    targets = [ target ];
  };
  rustPlatform = makeRustPlatform {
    cargo = rust;
    rustc = rust;
  };
  inherit (inputs) rune-rs;
  inherit (rustPlatform) buildRustPackage;
in
buildRustPackage rec {
  pname = "rune-ls-wasm";
  version = rune-rs.shortRev;

  src = rune-rs;
  patches = [ ./0001-add-wasm-specific-cargo-config.patch ];
  cargoLock.lockFile = ./Cargo.lock;

  doCheck = false;
  nativeBuildInputs = [ binaryen ];
  env.RUNE_VERSION = version;

  postPatch = ''
    ln -s ${./Cargo.lock} Cargo.lock
  '';

  buildPhase = ''
    cargo build --target='${target}' --package='rune-languageserver' --release
  '';

  installPhase = ''
    mkdir -p $out/bin
    wasm-opt -Oz target/${target}/release/rune-languageserver.wasm -o $out/bin/rune-languageserver.wasm
  '';
}
