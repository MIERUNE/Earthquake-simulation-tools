import type { Meta, StoryObj } from '@storybook/svelte';
import Component from '$lib/components/login/resetPassword.svelte';

const meta: Meta = {
	title: 'Login/resetPassword',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

export const Normal: Story = {
	args: {}
};
