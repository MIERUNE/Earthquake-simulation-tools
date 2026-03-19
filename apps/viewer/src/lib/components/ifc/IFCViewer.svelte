<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { IFCLoader } from 'web-ifc-three';
	import type { IFCModel } from 'web-ifc-three/IFC/components/IFCModel';
	import {
		Scene,
		PerspectiveCamera,
		WebGLRenderer,
		AmbientLight,
		DirectionalLight,
		Vector3,
		Raycaster,
		Vector2,
		MeshLambertMaterial
	} from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import {
		acceleratedRaycast,
		computeBoundsTree,
		disposeBoundsTree
	} from 'three-mesh-bvh';
	import { selectedElement } from '$lib/stores/ifcModalStore';

	export let ifcFilePath: string;
	export let onElementClick: (properties: any) => void;

	// Watch selectedElement store to clear highlight when panel is closed
	$: if ($selectedElement === null && ifcLoader && ifcModel && selectMaterial) {
		ifcLoader.ifcManager.removeSubset(ifcModel.modelID, selectMaterial);
	}

	let container: HTMLDivElement;
	let renderer: WebGLRenderer;
	let scene: Scene;
	let camera: PerspectiveCamera;
	let controls: OrbitControls;
	let ifcLoader: IFCLoader;
	let ifcModel: IFCModel | null = null;
	let selectMaterial: MeshLambertMaterial;
	let raycaster: Raycaster;
	let mouse: Vector2;

	onMount(() => {
		init();
		loadIFC();
		animate();
	});

	onDestroy(() => {
		cleanup();
	});

	const init = () => {
		// Scene
		scene = new Scene();

		// Camera
		camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 200);
		camera.position.set(10, 4, 10);

		// Renderer
		renderer = new WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setClearColor(0x004c68);
		container.appendChild(renderer.domElement);

		// Controls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;

		// Lights
		const ambientLight = new AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);

		const directionalLight = new DirectionalLight(0xffffff, 0.7);
		directionalLight.position.set(1, 0.5, 0.866);
		scene.add(directionalLight);

		// Selection material
		selectMaterial = new MeshLambertMaterial({
			transparent: true,
			opacity: 0.6,
			color: 0xff00ff,
			depthTest: false
		});

		// Raycaster for click detection
		raycaster = new Raycaster();
		mouse = new Vector2();

		// Click event
		renderer.domElement.addEventListener('click', handleClick);
	};

	const loadIFC = async () => {
		ifcLoader = new IFCLoader();
		ifcLoader.ifcManager.setupThreeMeshBVH(computeBoundsTree, disposeBoundsTree, acceleratedRaycast);
		ifcLoader.ifcManager.setWasmPath('/');

		try {
			ifcModel = await ifcLoader.loadAsync(ifcFilePath);
			ifcModel.name = 'ifc-model';

			// Center the model
			const center = new Vector3();
			(ifcModel as any).mesh.geometry.boundingBox.getCenter(center);
			ifcModel.position.copy(center.negate());

			scene.add(ifcModel);
		} catch (error) {
			console.error('Error loading IFC:', error);
		}
	};

	const handleClick = (event: MouseEvent) => {
		if (!ifcModel || !ifcLoader) return;

		const rect = renderer.domElement.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(scene.children, true);

		const manager = ifcLoader.ifcManager;

		if (intersects.length === 0) {
			manager.removeSubset(ifcModel.modelID);
			return;
		}

		const found = intersects[0];
		const index = found.faceIndex;

		if (index === undefined || index === null) return;

		const geometry = (found.object as IFCModel).geometry;
		const id = manager.getExpressId(geometry, index);

		manager.getItemProperties(ifcModel.modelID, id, true).then((value) => {
			onElementClick({
				expressId: id,
				id: value.GlobalId.value,
				name: value.Name.value,
				objectType: value.ObjectType.value,
				creationDate: value.OwnerHistory.CreationDate.value,
				applicationFullName: value.OwnerHistory.OwningApplication.ApplicationFullName.value
			});
		});

		const subset = manager.createSubset({
			modelID: ifcModel.modelID,
			ids: [id],
			material: selectMaterial,
			scene: scene,
			removePrevious: true
		});

		// Apply the same position transformation as the main model
		if (subset && ifcModel) {
			subset.position.copy(ifcModel.position);
			// Render highlight on top of everything
			subset.renderOrder = 999;
		}
	};

	const animate = () => {
		requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	};

	const cleanup = async () => {
		if (ifcLoader && ifcModel) {
			ifcLoader.ifcManager.removeSubset(ifcModel.modelID, selectMaterial);
			await ifcLoader.ifcManager.dispose();
		}

		if (renderer) {
			renderer.domElement.removeEventListener('click', handleClick);
			container?.removeChild(renderer.domElement);
			renderer.dispose();
		}

		if (controls) {
			controls.dispose();
		}
	};
</script>

<div
	bind:this={container}
	class="w-full h-[500px]"
	style="background: linear-gradient(0deg, rgba(0,66,76,1) 0%, rgba(0,90,104,1) 35%, rgba(76,223,247,1) 100%)"
></div>
