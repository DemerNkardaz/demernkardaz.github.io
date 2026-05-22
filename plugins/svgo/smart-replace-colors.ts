export function smartReplaceColorsPlugin() {
	return {
		name: 'smartReplaceColors',

		fn: () => {
			// Map: original color value → index (1-based)
			const colorIndexMap = new Map<string, number>()

			function getColorIndex(color: string): number {
				if (!colorIndexMap.has(color)) {
					colorIndexMap.set(color, colorIndexMap.size + 1)
				}
				return colorIndexMap.get(color)!
			}

			return {
				element: {
					enter: (node: any) => {
						if (node.attributes.fill && node.attributes.fill !== 'none') {
							getColorIndex(node.attributes.fill)
						}

						if (node.attributes.stroke && node.attributes.stroke !== 'none') {
							getColorIndex(node.attributes.stroke)
						}

						const style = node.attributes.style

						if (style) {
							const matches = style.match(/(?:fill|stroke):\s*([^;]+)/g)

							matches?.forEach((m: string) => {
								const color = m.split(':')[1].trim()

								if (color !== 'none') {
									getColorIndex(color)
								}
							})
						}
					},
				},

				root: {
					exit: (node: any) => {
						const multiColor = colorIndexMap.size > 1

						function varName(color: string, prop: 'fill' | 'stroke'): string {
							if (!multiColor) {
								return `var(--icon-${prop}, currentColor)`
							}
							const i = colorIndexMap.get(color)!
							return `var(--icon-${prop}-${i}, ${color})`
						}

						const SKIP_TAGS = new Set(['style', 'defs', 'symbol'])

						const walk = (children: any[]) => {
							children.forEach((child: any) => {
								if (child.type !== 'element') return

								if (SKIP_TAGS.has(child.name)) return

								const attrs = child.attributes

								if (child.name !== 'svg' && attrs.style) {
									attrs.style = attrs.style.replace(
										/fill:\s*([^;]+)/g,
										(_: string, color: string) => {
											const c = color.trim()
											return c === 'none' ? `fill:${c}` : `fill:${varName(c, 'fill')}`
										},
									)
									attrs.style = attrs.style.replace(
										/stroke:\s*([^;]+)/g,
										(_: string, color: string) => {
											const c = color.trim()
											return c === 'none' ? `stroke:${c}` : `stroke:${varName(c, 'stroke')}`
										},
									)
								}

								if (attrs.fill && attrs.fill !== 'none') {
									attrs.fill = varName(attrs.fill, 'fill')
								}

								if (attrs.stroke && attrs.stroke !== 'none') {
									attrs.stroke = varName(attrs.stroke, 'stroke')
								}

								if (child.children) {
									walk(child.children)
								}
							})
						}

						if (node.children) {
							walk(node.children)
						}

						if (multiColor) {
							const svgNode = node.children?.find(
								(c: any) => c.type === 'element' && c.name === 'svg',
							)

							if (svgNode) {
								const alreadyInjected = svgNode.children?.some(
									(c: any) =>
										c.type === 'element' &&
										c.name === 'style' &&
										c.children?.[0]?.value?.includes('--icon-fill-1'),
								)

								if (!alreadyInjected) {
									const cssVars = Array.from(colorIndexMap.entries())
										.flatMap(([color, i]) => [
											`--icon-fill-${i}:${color};`,
											`--icon-stroke-${i}:${color};`,
										])
										.join('')

									const styleNode = {
										type: 'element',
										name: 'style',
										attributes: {},
										children: [
											{
												type: 'text',
												value: `:host,svg{${cssVars}}`,
											},
										],
									}

									svgNode.children = [styleNode, ...(svgNode.children ?? [])]
								}
							}
						}
					},
				},
			}
		},
	}
}
