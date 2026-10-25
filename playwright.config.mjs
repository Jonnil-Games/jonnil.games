import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.mjs",
  workers: 1,
  timeout: 30000,
  retries: 0,
  outputDir: process.env.BLOG_TEST_OUTPUT || "test-results",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: process.env.BLOG_TEST_REPORT || "test-results/results.json",
      },
    ],
  ],
  use: {
    baseURL: process.env.BLOG_TEST_URL || "http://127.0.0.1:3100",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chrome",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: process.env.CHROME_BIN,
          args: ["--mute-audio", "--no-sandbox"],
        },
      },
    },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        launchOptions: { firefoxUserPrefs: { "media.volume_scale": "0.0" } },
      },
    },
  ],
  webServer: process.env.BLOG_TEST_URL
    ? undefined
    : {
        command: "node tests/serve.mjs",
        url: "http://127.0.0.1:3100/blog/",
        reuseExistingServer: false,
      },
});
