import type { Meta, StoryObj } from '@storybook/svelte';
import Component from '$lib/components/login/signUp.svelte';

const meta: Meta = {
	title: 'Login/signUp',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

export const Normal: Story = {
	args: {}
};
