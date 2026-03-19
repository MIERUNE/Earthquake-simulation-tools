import type { Meta, StoryObj } from '@storybook/svelte';
import Component from '$lib/components/login/signIn.svelte';

const meta: Meta = {
	title: 'Login/signIn',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

export const Normal: Story = {
	args: {}
};
