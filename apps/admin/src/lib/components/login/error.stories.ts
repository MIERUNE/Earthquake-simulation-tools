import type { Meta, StoryObj } from '@storybook/svelte';
import Component, { type Props } from '$lib/components/login/error.svelte';
import { text } from '$lib/components/storySnippet/Error.svelte';

const meta: Meta<Props> = {
	title: 'Login/error',
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
