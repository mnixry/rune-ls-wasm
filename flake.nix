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
      forAllSystems = lib.genAttrs lib.systems.flakeExposed;
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
          inherit (pkgs) callPackage;
        in
        {
          rune-languageserver = callPackage ./crates/rune-languageserver/default.nix { inherit inputs; };
          demo = callPackage ./packages/demo/default.nix { inherit inputs; };
        }
      );
      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsBySystem.${system};
          inherit (pkgs) mkShell;
          inherit (self.packages.${system}.rune-languageserver) rust;
        in
        mkShell {
          buildInputs = with pkgs; [
            rust
            pkg-config
            openssl
            emscripten
          ];
        }
      );
    };
}
