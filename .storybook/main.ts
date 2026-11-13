import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  features: { experimentalRSC: true },
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  // Stories never reach analytics, Sentry or real APIs.
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_ANALYTICS_ENABLED: "false",
    NEXT_PUBLIC_POSTHOG_KEY: "",
    NEXT_PUBLIC_SENTRY_DSN: "",
  }),
};

export default config;
