{
  description = "A flake for building the package";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    naersk = {
      url = "github:nix-community/naersk";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    pnpm2nix = {
      url = "github:wrvsrx/pnpm2nix-nzbr/adapt-to-v9";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    rune-rs = {
      url = "github:rune-rs/rune";
      flake = false;
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
      pnpm2nix,
      ...
    }@inputs:
    let
      inherit (nixpkgs) lib;
      forAllSystems = lib.genAttrs nixpkgs.lib.systems.flakeExposed;
      pkgsBySystem = forAllSystems (
        system:
        import nixpkgs {
          inherit system;
          overlays = [
            (import rust-overlay)
            pnpm2nix.overlays.default
          ];
        }
      );
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = pkgsBySystem.${system};
          inherit (pkgs) callPackage mkPnpmPackage;
          version = self.shortRev or self.dirtyShortRev or "unknown";
        in
        rec {
          rune-ls-wasm = callPackage ./pkgs/rune-ls-wasm.nix { inherit inputs; };
          demo = mkPnpmPackage {
            pname = "rune-ls-demo";
            inherit version;
            src = ./.;
            installInPlace = true;
            prePatch = ''
              ln -s ${rune-ls-wasm} result
            '';
            preConfigure = ''
              pnpm config set --global manage-package-manager-versions false
            '';
            distDir = "packages/demo/dist";
            packageJSON = pkgs.writers.writeJSON "package.json" (
              builtins.removeAttrs (lib.importJSON ./package.json) [ "packageManager" ]
            );
          };
        }
      );
    };
}
