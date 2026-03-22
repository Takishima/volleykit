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

  # Node.js for React web app, React Native mobile, and Cloudflare Worker
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm = {
      enable = true;
      install.enable = true;
    };
    # Root directory for pnpm workspaces - installs all workspace dependencies
    directory = ".";
  };

  # Dotenv support
  dotenv.enable = true;
  dotenv.disableHint = true;

  # Scripts for development
  scripts = {
    # Workspace-wide commands
    lint.exec = ''
      pnpm run lint
    '';

    test.exec = ''
      pnpm run test
    '';

    build.exec = ''
      pnpm run build
    '';

    format.exec = ''
      pnpm run format
    '';

    format-check.exec = ''
      pnpm run format:check
    '';

    # Web app
    web-dev.exec = ''
      cd packages/web && pnpm run dev
    '';

    web-build.exec = ''
      cd packages/web && VITE_BASE_PATH=/ pnpm run build
    '';

    web-preview.exec = ''
      cd packages/web && VITE_BASE_PATH=/ pnpm run preview
    '';

    web-test.exec = ''
      cd packages/web && pnpm test
    '';

    web-lint.exec = ''
      cd packages/web && pnpm run lint
    '';

    generate-api.exec = ''
      pnpm run generate:api
    '';

    # Shared package
    shared-build.exec = ''
      pnpm run shared:build
    '';

    shared-test.exec = ''
      pnpm run shared:test
    '';

    # Mobile app
    mobile-start.exec = ''
      pnpm run mobile:start
    '';

    mobile-ios.exec = ''
      pnpm run mobile:ios
    '';

    mobile-android.exec = ''
      pnpm run mobile:android
    '';

    # Cloudflare Worker
    worker-dev.exec = ''
      cd packages/worker && pnpm run dev
    '';

    worker-deploy.exec = ''
      cd packages/worker && pnpm exec wrangler deploy
    '';

    # Help site
    help-dev.exec = ''
      cd help-site && pnpm run dev
    '';

    help-build.exec = ''
      cd help-site && pnpm run build
    '';
  };

  # Background process for development with production-like base path
  # Run with: devenv up
  processes.web.exec = "cd packages/web && VITE_BASE_PATH=/ pnpm run dev";

  # Treefmt for code formatting
  treefmt = {
    enable = true;

    config = {
      programs = {
        nixfmt.enable = true;
        yamlfmt.enable = true;
        shfmt = {
          enable = true;
          indent_size = 2;
        };
        # Use the workspace-installed Prettier so treefmt and pnpm run format
        # always produce identical output (avoids version drift between nix and pnpm).
        prettier = {
          enable = true;
          package = pkgs.writeShellScriptBin "prettier" ''
            exec ${config.devenv.root}/node_modules/.bin/prettier "$@"
          '';
          includes = [
            "**/*.ts"
            "**/*.tsx"
            "**/*.js"
            "**/*.jsx"
            "**/*.mjs"
            "**/*.json"
            "**/*.css"
            "**/*.md"
            "**/*.astro"
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
          # Node modules and build outputs
          "**/node_modules"
          "**/dist"
          "**/.expo"
          # Generated files
          "packages/web/src/api/schema.ts"
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

    # Pre-commit validation (lint, knip, test, build)
    # Only runs in Claude Code web environment (CLAUDE_CODE_REMOTE=true)
    pre-commit-validate = {
      enable = true;
      name = "pre-commit-validate";
      entry = "${config.devenv.root}/scripts/pre-commit-validate.sh";
      language = "script";
      stages = [ "pre-commit" ];
      pass_filenames = false;
      always_run = true;
    };
  };
}
