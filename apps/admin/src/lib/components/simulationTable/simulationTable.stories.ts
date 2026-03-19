import type { Meta, StoryObj } from '@storybook/svelte';
import Component, { type Props } from '$lib/components/simulationTable/Table.svelte';
import { tableHeader, tableRows } from '$lib/components/storySnippet/simulationTable.svelte';

const meta: Meta<Props> = {
	title: 'simulationTable',
	component: Component,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj<Props>;

export const Normal: Story = {
	args: {
		header: tableHeader,
		children: tableRows
	}
};
