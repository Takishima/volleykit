{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:
{
  name = "volleykit";

  # Base packages
  packages = with pkgs; [
    git
    curl
    jq
  ];

  # Node.js for React web app and Cloudflare Worker
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm = {
      enable = true;
      install.enable = true;
    };
    # Primary project directory for automatic npm install
    directory = "web-app";
  };

  # Dotenv support
  dotenv.enable = true;
  dotenv.disableHint = true;

  # Auto-install worker dependencies
  # Note: web-app uses languages.javascript.npm.install (built-in feature)
  # Worker requires custom script because devenv's npm.install only supports
  # a single directory (specified in languages.javascript.directory)
  # Uses a marker file for reliable freshness detection (comparing against directories is unreliable)
  enterShell = ''
    if [ -d "worker" ] && [ -f "worker/package.json" ]; then
      if [ ! -f "worker/node_modules/.installed" ] || \
         [ "worker/package.json" -nt "worker/node_modules/.installed" ] || \
         { [ -f "worker/package-lock.json" ] && [ "worker/package-lock.json" -nt "worker/node_modules/.installed" ]; }; then
        echo "Installing worker dependencies..."
        if (cd worker && npm install --loglevel=error); then
          touch worker/node_modules/.installed
        else
          echo "⚠️  Warning: Failed to install worker dependencies"
          echo "   Run 'cd worker && npm install' manually to see the full error"
        fi
      fi
    fi
  '';

  # Scripts for development
  scripts = {
    # Web app development
    dev.exec = ''
      cd web-app && npm run dev
    '';

    build.exec = ''
      cd web-app && VITE_BASE_PATH=/volleykit/ npm run build
    '';

    preview.exec = ''
      cd web-app && VITE_BASE_PATH=/volleykit/ npm run preview
    '';

    run-tests.exec = ''
      cd web-app && npm test
    '';

    lint.exec = ''
      cd web-app && npm run lint
    '';

    generate-api.exec = ''
      cd web-app && npm run generate:api
    '';

    # Cloudflare Worker
    worker-install.exec = ''
      cd worker && npm install && touch node_modules/.installed
    '';

    worker-dev.exec = ''
      cd worker && npm run dev
    '';

    worker-deploy.exec = ''
      cd worker && npx wrangler deploy
    '';
  };

  # Background process for development with production-like base path
  # Run with: devenv up
  processes.web.exec = "cd web-app && VITE_BASE_PATH=/volleykit/ npm run dev";

  # Treefmt for code formatting
  treefmt = {
    enable = true;

    config = {
      programs = {
        nixfmt.enable = true;
        yamlfmt.enable = true;
        mdformat.enable = true;
        shfmt = {
          enable = true;
          indent_size = 2;
        };
        prettier = {
          enable = true;
          includes = [
            "web-app/**/*.ts"
            "web-app/**/*.tsx"
            "web-app/**/*.js"
            "web-app/**/*.jsx"
            "web-app/**/*.json"
            "web-app/**/*.css"
            "worker/**/*.ts"
          ];
        };
      };

      settings = {
        global.excludes = [
          ".direnv"
          ".devenv"
          "result"
          "flake.lock"
          "devenv.lock"
          "*.har"
          ".claude"
          "web-app/node_modules"
          "web-app/dist"
          "web-app/src/api/schema.ts"
          "worker/node_modules"
        ];
      };
    };
  };

  # Pre-commit hooks
  git-hooks.hooks = {
    # Formatting
    treefmt.enable = true;

    # Security
    ripsecrets.enable = true;
    detect-private-keys.enable = true;

    # Commit quality
    convco.enable = true;
    check-merge-conflicts.enable = true;
    check-added-large-files.enable = true;

    # File validation
    check-yaml.enable = true;
    check-json = {
      enable = true;
      # Exclude tsconfig files as they use JSONC (JSON with comments)
      excludes = [ "tsconfig.*\\.json$" ];
    };
  };
}
