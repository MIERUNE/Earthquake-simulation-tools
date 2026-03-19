import type { Meta, StoryObj } from '@storybook/svelte';
import Component, { type Props } from '$lib/components/login/warning.svelte';
import { text } from '$lib/components/storySnippet/Warning.svelte';

const meta: Meta<Props> = {
	title: 'Login/warning',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj<Props>;

export const Normal: Story = {
	args: {
		children: text
	}
};
