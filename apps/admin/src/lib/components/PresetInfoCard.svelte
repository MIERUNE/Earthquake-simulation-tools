<script lang="ts" module>
	export interface Props {
		presetLabel: string;
		presetName: string;
	}
</script>

<script lang="ts">
	let { presetLabel, presetName }: Props = $props();
</script>

<div class="h-64 w-[470px] border border-solid border-primary p-5">
	<div class="mx-auto my-0 w-[90%] text-left font-bold">{presetLabel}</div>
	<div class="mt-2">
		<div class="ax-auto my-0 w-[90%] text-left font-bold">名称:</div>
		<div class="ax-auto my-0 w-[90%] text-left">
			{presetName}
		</div>
	</div>
</div>
