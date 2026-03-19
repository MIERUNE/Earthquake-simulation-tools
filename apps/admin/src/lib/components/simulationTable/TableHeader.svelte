<script lang="ts" module>
	export interface Props {
		headerItems: string[];
	}
</script>

<script lang="ts">
	let { headerItems }: Props = $props();
</script>

<tr>
	{#each headerItems as headerItem}
		<th
			class="h-10 border-b-4 border-solid border-secondary text-left align-middle text-base font-semibold"
		>
			{headerItem}
		</th>
	{/each}
</tr>
