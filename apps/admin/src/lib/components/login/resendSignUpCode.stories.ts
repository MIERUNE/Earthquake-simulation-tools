import type { Meta, StoryObj } from '@storybook/svelte';
import Component from '$lib/components/login/resendSignUpCode.svelte';

const meta: Meta = {
	title: 'Login/resendSignUpCode',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

export const Normal: Story = {
	args: {}
};
