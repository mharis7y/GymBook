// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: [
      "dist/*",
      "src/components/app-tabs*",
      "src/components/external-link*",
      "src/components/hint-row*",
      "src/components/themed-*",
      "src/components/web-badge*",
      "src/components/ui/*",
      "src/constants/theme.js",
      "src/hooks/use-color-scheme.web.js",
      "src/hooks/use-theme.js"
    ],
  },
  expoConfig,
  {
    rules: {
      "import/no-unresolved": "off",
    },
  }
]);
