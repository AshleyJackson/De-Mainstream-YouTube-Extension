import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import * as path from 'path';
import * as fs from 'fs';

function extensionBuildPlugin() {
	return {
		name: 'extension-build',
		async closeBundle() {
			const outDir = path.resolve('build');
			const srcDir = path.resolve('src/extension');
			if (!fs.existsSync(srcDir)) return;

			// Use esbuild to compile extension TypeScript files
			const { build } = await import('esbuild');
			const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'channels.ts' && f !== 'index.ts');

			for (const file of files) {
				const entry = path.join(srcDir, file);
				const outfile = path.join(outDir, file.replace('.ts', '.js'));
				await build({
					entryPoints: [entry],
					outfile,
					bundle: true,
					format: 'esm',
					platform: 'browser',
					target: 'es2022',
					minify: false,
					external: ['chrome'],
				});
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), extensionBuildPlugin()],
	build: {
		rollupOptions: {
			external: []
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
