import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['three', 'web-ifc-three', 'three-mesh-bvh']
	},
	resolve: {
		alias: {
			'three/examples/jsm': 'three/examples/jsm'
		}
	}
});
