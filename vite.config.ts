import { sveltekit } from '@sveltejs/kit/vite';
import dsv from '@rollup/plugin-dsv';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		dsv(),
		sveltekit(),
	],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
		port: 3000
	},
});
