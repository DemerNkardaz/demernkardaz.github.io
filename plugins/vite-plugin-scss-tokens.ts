import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const VARIABLES_FILE = 'src/styles/_variables.scss';
const TOKENS_FILE = 'src/styles/_tokens.scss';

/**
 * Парсит SCSS-файл и возвращает список имён переменных (без $).
 * Поддерживает объявления вида:
 *   $color-primary: #fff;
 *   $font-size-base: 16px !default;
 */
function parseVariableNames(content: string): string[] {
	const regex = /^\s*--([\w-]+)\s*:/gm;
	const names: string[] = [];
	let match: RegExpExecArray | null;

	while ((match = regex.exec(content)) !== null) {
		names.push(match[1]);
	}

	return names;
}

/**
 * Генерирует содержимое _tokens.scss из списка имён переменных.
 * Результат:  $color-primary: var(--color-primary);
 */
function generateTokens(names: string[]): string {
	const lines = names.map((name) => `$${name}: var(--${name});`);
	return [
		'// AUTO-GENERATED — do not edit manually.',
		'// Source: src/styles/_variables.scss',
		'',
		...lines,
		'',
	].join('\n');
}

function syncTokens(root: string, log?: (msg: string) => void) {
	const varsPath = path.resolve(root, VARIABLES_FILE);
	const tokensPath = path.resolve(root, TOKENS_FILE);

	if (!fs.existsSync(varsPath)) {
		log?.(`[scss-tokens] Source not found: ${VARIABLES_FILE}`);
		return;
	}

	const source = fs.readFileSync(varsPath, 'utf-8');
	const names = parseVariableNames(source);

	if (names.length === 0) {
		log?.('[scss-tokens] No variables found — tokens file not updated.');
		return;
	}

	const tokens = generateTokens(names);

	// Пишем только если содержимое реально изменилось (избегаем лишних ребилдов)
	const existing = fs.existsSync(tokensPath) ? fs.readFileSync(tokensPath, 'utf-8') : '';
	if (existing === tokens) return;

	fs.mkdirSync(path.dirname(tokensPath), { recursive: true });
	fs.writeFileSync(tokensPath, tokens, 'utf-8');
	log?.(`[scss-tokens] Updated ${TOKENS_FILE} (${names.length} variables)`);
}

export default function scssTokensPlugin(): Plugin {
	let root = process.cwd();

	return {
		name: 'vite-plugin-scss-tokens',

		// Запускаем сразу при старте, чтобы файл был актуален до первой компиляции
		buildStart() {
			syncTokens(root, (msg) => console.log(msg));
		},

		configResolved(config) {
			root = config.root;
		},

		configureServer(server) {
			const varsAbs = path.resolve(root, VARIABLES_FILE);

			// Добавляем файл в список отслеживаемых (на случай, если он вне src/)
			server.watcher.add(varsAbs);

			server.watcher.on('change', (file) => {
				if (path.resolve(file) !== varsAbs) return;
				syncTokens(root, (msg) => server.config.logger.info(msg, { timestamp: true }));
			});
		},
	};
}
