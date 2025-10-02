{
  description = "A flake for building the package";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    rune-rs = {
      url = "github:rune-rs/rune";
      flake = false;
    };
  };

  outputs =
    { nixpkgs, rust-overlay, ... }@inputs:
    let
      inherit (nixpkgs) lib;
      forAllSystems = lib.genAttrs nixpkgs.lib.systems.flakeExposed;
      pkgsBySystem = forAllSystems (
        system:
        import nixpkgs {
          inherit system;
          overlays = [ (import rust-overlay) ];
        }
      );
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = pkgsBySystem.${system};
          inherit (pkgs) callPackage;
        in
        {
          rune-ls-wasm = callPackage ./pkgs/rune-ls-wasm.nix { inherit inputs; };
        }
      );
    };
}
