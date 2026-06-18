import ghpages from 'gh-pages';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');

ghpages.publish(
	distPath,
	{
		branch: 'gh-pages',
		repo: 'https://github.com/DemerNkardaz/demernkardaz.github.io.git',
		clean: true,
		message: 'deploy: update gh-pages',
		dotfiles: true,
	},
	(err) => {
		if (err) {
			console.error('❌ Deploy failed:', err);
			process.exit(1);
		} else {
			console.log('✅ Deployed to gh-pages (remote: deploy)');
		}
	}
);
