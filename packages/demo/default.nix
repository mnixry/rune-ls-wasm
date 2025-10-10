{
  mkPnpmPackage,
  writers,
  lib,
  inputs,
  system,
}:
let
  inherit (inputs) self;
  inherit (self.packages.${system}) rune-languageserver;
in
mkPnpmPackage {
  src = self;
  installInPlace = true;
  preConfigure = ''
    pnpm config set --global manage-package-manager-versions false
  '';
  preBuild = ''
    ln -s ${rune-languageserver} result
  '';
  distDir = "packages/demo/dist";
  packageJSON = writers.writeJSON "package.json" (
    builtins.removeAttrs (lib.importJSON ./package.json) [ "packageManager" ]
  );
}
