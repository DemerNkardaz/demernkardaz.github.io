import Components from 'unplugin-vue-components/vite';
import path from 'node:path';

export default function createComponents() {
  return Components({
    dirs: [path.resolve(process.cwd(), 'src/components')],

    dts: path.resolve(process.cwd(), 'src/types/components.d.ts'),

    directoryAsNamespace: true,
    collapseSamePrefixes: true,
    deep: true,

    extensions: ['vue', 'svg'],
    include: [/\.vue$/, /\.vue\?vue/],

    globalNamespaces: ['ui', 'patterns', 'sections', 'primitives', 'integrations'],
  });
}
