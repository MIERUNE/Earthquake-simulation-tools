import type { Meta, StoryObj } from '@storybook/svelte';
import Component from '$lib/components/login/requestCode.svelte';

const meta: Meta = {
	title: 'Login/requestCode',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

export const Normal: Story = {
	args: {}
};
