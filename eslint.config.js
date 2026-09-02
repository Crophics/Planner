module.exports = [
  {
    files: ["js/**/*.js"],
    ignores: ["js/fcm-config.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        Notification: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        crypto: "readonly",
        alert: "readonly",
        location: "readonly",
        navigator: "readonly",
        getComputedStyle: "readonly",
        requestAnimationFrame: "readonly",
        Blob: "readonly",
        URL: "readonly",
        FileReader: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrors: "none",
      }],
      "no-undef": "error",
    },
  },
  {
    files: ["js/fcm-config.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        global: "readonly",
      },
    },
  },
];