<script lang="ts">
	import type { IFCDataType } from '$lib/stores/ifcModalStore';

	export let id: string | undefined = undefined;
	export let dataType: IFCDataType = null;

	type IFCFloorImages = {
		floor: string;
		image: string[];
	};

	const IDList: Record<string, string[]> = {
		'1F': [
			'38PK7t_wfFQRvV6YNJ0zXn',
			'38PK7t_wfFQRvV6YNJ0zgt',
			'38PK7t_wfFQRvV6YNJ0zhf',
			'38PK7t_wfFQRvV6YNJ0zhd',
			'38PK7t_wfFQRvV6YNJ0zhQ',
			'38PK7t_wfFQRvV6YNJ0zhG',
			'38PK7t_wfFQRvV6YNJ0zeq',
			'38PK7t_wfFQRvV6YNJ0zfT',
			'38PK7t_wfFQRvV6YNJ0zk_',
			'38PK7t_wfFQRvV6YNJ0zkR',
			'38PK7t_wfFQRvV6YNJ0oHG',
			'12QgZUJpT2BP5ARZGiK9mp',
			'38PK7t_wfFQRvV6YNJ0oKp',
			'31pTlTgRv0XvgSDeAI0f50',
			'38PK7t_wfFQRvV6YNJ0oQv',
			'0TFpAy4mL6fhHpm9ovkRYa',
			'38PK7t_wfFQRvV6YNJ0oQ8',
			'3jW9rWZff5Zvg6RcrAPkzc',
			'38PK7t_wfFQRvV6YNJ0oRU',
			'38PK7t_wfFQRvV6YNJ0oPk',
			'38PK7t_wfFQRvV6YNJ0oTb',
			'38PK7t_wfFQRvV6YNJ0oTM'
		],
		'2F': [
			'0J71D_z7zDNPEqfvF2IkCP',
			'0J71D_z7zDNPEqfvF2Ilnv',
			'0J71D_z7zDNPEqfvF2Ilwa',
			'0J71D_z7zDNPEqfvF2IlvL',
			'1_mvTnNNTEh8ZZMgeNqD0r',
			'1_mvTnNNTEh8ZZMgeNqDvo',
			'1_mvTnNNTEh8ZZMgeNqDwc',
			'1_mvTnNNTEh8ZZMgeNqDrL',
			'1_mvTnNNTEh8ZZMgeNqDmL',
			'1_mvTnNNTEh8ZZMgeNqDm0',
			'1_mvTnNNTEh8ZZMgeNqDpB',
			'1_mvTnNNTEh8ZZMgeNqDol',
			'1_mvTnNNTEh8ZZMgeNqDjL'
		],
		'3F': [
			'3rf8dPMZn6i8PYdWP8CFAD',
			'3rf8dPMZn6i8PYdWP8CFLs',
			'3rf8dPMZn6i8PYdWP8CFLV',
			'3rf8dPMZn6i8PYdWP8CFLE',
			'3rf8dPMZn6i8PYdWP8CFKz',
			'3rf8dPMZn6i8PYdWP8CFKo',
			'3rf8dPMZn6i8PYdWP8CFKd',
			'3rf8dPMZn6i8PYdWP8CFKK',
			'3rf8dPMZn6i8PYdWP8CFK9',
			'3rf8dPMZn6i8PYdWP8CFN_',
			'3rf8dPMZn6i8PYdWP8CFNp',
			'3rf8dPMZn6i8PYdWP8CFNa',
			'3rf8dPMZn6i8PYdWP8CFNT'
		],
		'4F': [
			'3rf8dPMZn6i8PYdWP8CFMG',
			'3rf8dPMZn6i8PYdWP8CFHv',
			'3rf8dPMZn6i8PYdWP8CFHY',
			'3rf8dPMZn6i8PYdWP8CFHH',
			'3rf8dPMZn6i8PYdWP8CFH0',
			'3rf8dPMZn6i8PYdWP8CFGr',
			'3rf8dPMZn6i8PYdWP8CFGg',
			'3rf8dPMZn6i8PYdWP8CFGV',
			'3rf8dPMZn6i8PYdWP8CFGC',
			'3rf8dPMZn6i8PYdWP8CFG1',
			'3rf8dPMZn6i8PYdWP8CFJs',
			'3rf8dPMZn6i8PYdWP8CFJl',
			'3rf8dPMZn6i8PYdWP8CFJW'
		],
		'5F': [
			'3rf8dPMZn6i8PYdWP8CFV$',
			'3rf8dPMZn6i8PYdWP8CFVm',
			'3rf8dPMZn6i8PYdWP8CFVf',
			'3rf8dPMZn6i8PYdWP8C8nx',
			'3rf8dPMZn6i8PYdWP8C8nY',
			'3rf8dPMZn6i8PYdWP8C8nN',
			'3rf8dPMZn6i8PYdWP8C8n4',
			'3rf8dPMZn6i8PYdWP8C8mv',
			'3rf8dPMZn6i8PYdWP8C8mk',
			'3rf8dPMZn6i8PYdWP8C8mZ'
		],
		'6F': [
			'3rf8dPMZn6i8PYdWP8CFO0',
			'3rf8dPMZn6i8PYdWP8CFRv',
			'3rf8dPMZn6i8PYdWP8CFRo',
			'3rf8dPMZn6i8PYdWP8C8Yq',
			'3rf8dPMZn6i8PYdWP8C8YZ',
			'3rf8dPMZn6i8PYdWP8C8YG',
			'3rf8dPMZn6i8PYdWP8C8Y5',
			'3rf8dPMZn6i8PYdWP8C8jw',
			'3rf8dPMZn6i8PYdWP8C8jl',
			'3rf8dPMZn6i8PYdWP8C8jS'
		],
		'7F': [
			'3rf8dPMZn6i8PYdWP8CFa9',
			'3rf8dPMZn6i8PYdWP8CFa2',
			'3rf8dPMZn6i8PYdWP8CFdx',
			'3rf8dPMZn6i8PYdWP8C8ST',
			'3rf8dPMZn6i8PYdWP8C8S4',
			'3rf8dPMZn6i8PYdWP8C8Vv',
			'3rf8dPMZn6i8PYdWP8C8Vk',
			'3rf8dPMZn6i8PYdWP8C8VZ',
			'3rf8dPMZn6i8PYdWP8C8VG',
			'3rf8dPMZn6i8PYdWP8C8V5'
		],
		'8F': [
			'3rf8dPMZn6i8PYdWP8CFWI',
			'3rf8dPMZn6i8PYdWP8CFWB',
			'3rf8dPMZn6i8PYdWP8CFZy',
			'3rf8dPMZn6i8PYdWP8C829',
			'3rf8dPMZn6i8PYdWP8C8Dm',
			'3rf8dPMZn6i8PYdWP8C8Db',
			'3rf8dPMZn6i8PYdWP8C8DQ',
			'3rf8dPMZn6i8PYdWP8C8DF',
			'3rf8dPMZn6i8PYdWP8C8Cy',
			'3rf8dPMZn6i8PYdWP8C8Cn'
		],
		'9F': [
			'3rf8dPMZn6i8PYdWP8C95O',
			'3rf8dPMZn6i8PYdWP8C95H',
			'3rf8dPMZn6i8PYdWP8C95A',
			'3rf8dPMZn6i8PYdWP8C8C7',
			'3rf8dPMZn6i8PYdWP8C8Fk',
			'3rf8dPMZn6i8PYdWP8C8FZ',
			'3rf8dPMZn6i8PYdWP8C8FG',
			'3rf8dPMZn6i8PYdWP8C8F5',
			'3rf8dPMZn6i8PYdWP8C8Ew',
			'3rf8dPMZn6i8PYdWP8C8El'
		],
		'10F': [
			'3rf8dPMZn6i8PYdWP8C9M_',
			'3rf8dPMZn6i8PYdWP8C9Mt',
			'3rf8dPMZn6i8PYdWP8C9Me',
			'3rf8dPMZn6i8PYdWP8C89z',
			'3rf8dPMZn6i8PYdWP8C89a',
			'3rf8dPMZn6i8PYdWP8C89P',
			'3rf8dPMZn6i8PYdWP8C89E',
			'3rf8dPMZn6i8PYdWP8C893',
			'3rf8dPMZn6i8PYdWP8C88m',
			'3rf8dPMZn6i8PYdWP8C88b'
		]
	};

	const getFloorById = (id: string): string | null => {
		for (const key in IDList) {
			if (IDList[key].some((value) => value === id)) return key;
		}
		return null;
	};

	const getIFCGraphImagePaths = (id: string, dataType: 'after' | 'fore'): IFCFloorImages => {
		if (id === '0o4RqXVrP4UOeE6WhYzCWF') {
			// A12
			return {
				floor: '',
				image: [
					`/ifcGraphImage/${dataType}/item/${dataType}_A12_left.png`,
					`/ifcGraphImage/${dataType}/item/${dataType}_A12_right.png`
				]
			};
		}
		if (id === '0o4RqXVrP4UOeE6WhYzCWu') {
			// B12
			return {
				floor: '',
				image: [
					`/ifcGraphImage/${dataType}/item/${dataType}_B12_left.png`,
					`/ifcGraphImage/${dataType}/item/${dataType}_B12_right.png`
				]
			};
		}
		if (id === '0o4RqXVrP4UOeE6WhYzCZI') {
			// A2
			return {
				floor: '',
				image: [
					`/ifcGraphImage/${dataType}/item/${dataType}_A2_top_X.png`,
					`/ifcGraphImage/${dataType}/item/${dataType}_A2_top_Y.png`,
					`/ifcGraphImage/${dataType}/item/${dataType}_A2_bottom_X.png`,
					`/ifcGraphImage/${dataType}/item/${dataType}_A2_bottom_Y.png`
				]
			};
		}
		const floorName = getFloorById(id);
		if (floorName) {
			return {
				floor: floorName,
				image: [
					`/ifcGraphImage/${dataType}/floor/${dataType}_long_${floorName}.png`,
					`/ifcGraphImage/${dataType}/floor/${dataType}_short_${floorName}.png`
				]
			};
		}

		return { floor: '', image: [] };
	};

	$: ifcImages = id && dataType ? getIFCGraphImagePaths(id, dataType) : { floor: '', image: [] };
</script>

{#if id && dataType}
	<div>
		{#if ifcImages.floor}
			<p class="ml-2 font-bold">{ifcImages.floor}</p>
		{/if}
		{#each ifcImages.image as imagePath}
			<img src={imagePath} width="400px" alt="IFC Graph" />
		{/each}
	</div>
{/if}
