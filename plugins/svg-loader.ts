import svgLoader from 'vite-svg-loader';
import { smartReplaceColorsPlugin } from './svgo/smart-replace-colors';

export default function createSvgLoader() {
	return svgLoader({
		svgo: true,
		svgoConfig: {
			multipass: false,
			plugins: [
				{
					name: 'preset-default',
					params: {
						overrides: {
							removeViewBox: false,
						},
					},
				},

				{
					name: 'removeDimensions',
				},

				smartReplaceColorsPlugin(),
			],
		},
	});
}
