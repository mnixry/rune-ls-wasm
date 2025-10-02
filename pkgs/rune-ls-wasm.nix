{
  rust-bin,
  callPackage,
  stdenvNoCC,
  emscripten,
  inputs,
}:
let
  target = "wasm32-unknown-emscripten";
  rustPackage = rust-bin.nightly.latest;
  rust = rustPackage.default.override {
    extensions = [ "rust-src" ];
    targets = [ target ];
  };
  inherit (inputs) naersk rune-rs;
  inherit
    (callPackage naersk {
      cargo = rust;
      rustc = rust;
    })
    buildPackage
    ;
in
buildPackage rec {
  name = "rune-languageserver";
  version = rune-rs.shortRev;
  src = stdenvNoCC.mkDerivation {
    name = "${name}-src";
    inherit version;
    src = rune-rs;
    patches = [ ./0001-add-wasm-specific-cargo-config.patch ];
    postPatch = ''
      ln -s ${./Cargo.lock} Cargo.lock
    '';
    installPhase = ''
      cp -r . $out
    '';
  };
  additionalCargoLock = "${rust}/lib/rustlib/src/rust/library/Cargo.lock";

  doCheck = false;
  nativeBuildInputs = [ emscripten ];
  env.RUNE_VERSION = version;

  cargoBuildOptions =
    prev:
    [
      "--target"
      target
      "--package"
      "rune-languageserver"
    ]
    ++ prev;
}
