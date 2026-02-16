// @ts-check
const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
	entryPoints: ['src/extension.ts'],
	bundle: true,
	outfile: 'out/extension.js',
	external: ['vscode'],
	format: 'cjs',
	platform: 'node',
	target: 'es2020',
	sourcemap: true,
	minify: false,
};

async function main() {
	if (watch) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		console.log('Watching for changes...');
	} else {
		await esbuild.build(buildOptions);
		console.log('Build complete.');
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
