import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TokenTable, TypeScale } from "./tokens";

const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = { render: () => <TokenTable kind="color" /> };
export const Typography: Story = { render: () => <TokenTable kind="font" /> };
export const TypeScaleThai: Story = { name: "Type scale (Thai + Latin)", render: () => <TypeScale /> };
export const Spacing: Story = { render: () => <TokenTable kind="spacing" /> };
export const Radius: Story = { render: () => <TokenTable kind="radius" /> };
export const Shadows: Story = { render: () => <TokenTable kind="shadow" /> };
export const Motion: Story = { render: () => <TokenTable kind="motion" /> };
