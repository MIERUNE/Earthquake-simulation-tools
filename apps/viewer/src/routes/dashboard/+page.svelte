<script lang="ts">
	import DashboardPage from '../../pages/DashboardPage.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<DashboardPage {data} />
