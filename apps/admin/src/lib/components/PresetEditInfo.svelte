<script lang="ts" module>
	export interface Props {
		presetLabel: string;
		presetName: string;
		presetInfo: string;
	}
</script>

<script lang="ts">
	let { presetLabel, presetName, presetInfo = $bindable() }: Props = $props();
</script>

<div class="mt-10">
	<span class="inline-block w-48 text-left text-base font-bold">{presetLabel}</span>
	<span class="inline-block w-[600px] text-left">{presetName}</span>
</div>
<div class="mt-10">
	<label class="inline-block w-48 text-left text-base font-bold" for="additional_info">
		付帯情報
	</label>
	<textarea
		name="additional_info"
		class="inline-block h-48 w-[600px] overflow-auto whitespace-pre-wrap rounded-md border border-solid border-primary p-2 text-left align-top"
		bind:value={presetInfo}
	></textarea>
</div>
