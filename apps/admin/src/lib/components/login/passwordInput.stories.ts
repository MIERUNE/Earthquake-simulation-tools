import type { Meta, StoryObj } from '@storybook/svelte';
import Component, { type Props } from '$lib/components/login/passwordInput.svelte';

const meta: Meta<Props> = {
	title: 'Login/passwordInput',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj<Props>;

export const Normal: Story = {
	args: {
		value: '',
		placeholder: 'password'
	}
};
