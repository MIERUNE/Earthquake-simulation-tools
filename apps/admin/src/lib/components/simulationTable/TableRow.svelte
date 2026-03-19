<script lang="ts" module>
	export interface Props {
		regionName: string;
		presetName: string;
		time: string;
		status: string;
		detailPath: string;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';

	let { regionName, presetName, time, status, detailPath }: Props = $props();

	const date = new Date(time);
</script>

<tr class="h-6">
	<td class="h-12 border-b border-solid border-secondary text-left">{regionName}</td>
	<td class="h-12 border-b border-solid border-secondary text-left">{presetName}</td>
	<td class="h-12 border-b border-solid border-secondary text-left">
		<span class="inline-block w-24">{date.toLocaleDateString()}</span>
		<span></span>
		<span class="inline-block w-24">{date.toLocaleTimeString()}</span>
	</td>
	<td class="h-12 border-b border-solid border-secondary text-left">{status}</td>
	<td class="h-12 border-b border-solid border-secondary text-left">
		<Button variant="outline" onclick={() => goto(detailPath)}>詳細</Button>
	</td>
</tr>
