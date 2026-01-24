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
    npm = {
      enable = true;
      install.enable = true;
    };
    # Root directory for npm workspaces - installs all workspace dependencies
    directory = ".";
  };

  # Dotenv support
  dotenv.enable = true;
  dotenv.disableHint = true;

  # Scripts for development
  scripts = {
    # Workspace-wide commands
    lint.exec = ''
      npm run lint
    '';

    test.exec = ''
      npm run test
    '';

    build.exec = ''
      npm run build
    '';

    format.exec = ''
      npm run format
    '';

    format-check.exec = ''
      npm run format:check
    '';

    # Web app
    web-dev.exec = ''
      cd web-app && npm run dev
    '';

    web-build.exec = ''
      cd web-app && VITE_BASE_PATH=/volleykit/ npm run build
    '';

    web-preview.exec = ''
      cd web-app && VITE_BASE_PATH=/volleykit/ npm run preview
    '';

    web-test.exec = ''
      cd web-app && npm test
    '';

    web-lint.exec = ''
      cd web-app && npm run lint
    '';

    generate-api.exec = ''
      npm run generate:api
    '';

    # Shared package
    shared-build.exec = ''
      npm run shared:build
    '';

    shared-test.exec = ''
      npm run shared:test
    '';

    # Mobile app
    mobile-start.exec = ''
      npm run mobile:start
    '';

    mobile-ios.exec = ''
      npm run mobile:ios
    '';

    mobile-android.exec = ''
      npm run mobile:android
    '';

    # Cloudflare Worker
    worker-dev.exec = ''
      cd worker && npm run dev
    '';

    worker-deploy.exec = ''
      cd worker && npx wrangler deploy
    '';

    # Help site
    help-dev.exec = ''
      cd help-site && npm run dev
    '';

    help-build.exec = ''
      cd help-site && npm run build
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
        shfmt = {
          enable = true;
          indent_size = 2;
        };
        # Use Prettier for the same file types as npm run format
        prettier = {
          enable = true;
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
          "web-app/src/api/schema.ts"
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
