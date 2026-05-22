import AutoImport from 'unplugin-auto-import/vite';
import path from 'node:path';

export default function createAutoImport() {
	return AutoImport({
		imports: ['vue', 'vue-router', 'vue-i18n', 'pinia'],

		dirs: [path.resolve(process.cwd(), 'src/constants')],

		dts: 'src/types/auto-imports.d.ts',
	});
}
