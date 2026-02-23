{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    yarn
    python3
    git
    jq
  ];

  shellHook = ''
    echo "🚀 Element Web development environment"
    echo "Node version: $(node --version)"
    echo "Yarn version: $(yarn --version)"
    echo ""
    echo "To build MindRoom-customized Element:"
    echo "  1. yarn install"
    echo "  2. yarn build"
    echo "  3. yarn start (for development)"
    echo ""
  '';
}