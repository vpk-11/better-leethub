import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import FileManagerPlugin from 'filemanager-webpack-plugin';
// https://stackoverflow.com/a/62892482/
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extensionVersion = process.env.npm_package_version;

// Ignore when copying
const ignore = [
  // non-essential
  '**/dist/**',
  '**/.prettierrc',
  '**/.eslintrc',
  '**/.env',
  '**/assets/.DS_Store',
  '**/package*',
  '**/pnpm-lock.yaml',
  '**/webpack*',
  '**/tsconfig.json',
  '**/eslint.config.js',
  '**/README.md',
  '**/PRIVACY.md',
  '**/assets/extension', // web store assets
  // webpack compiled files
  '**/scripts/leetcode/**',
  '**/scripts/welcome.ts',
  '**/scripts/popup.ts',
  '**/scripts/background.ts',
  '**/scripts/configsSummary.ts',
  '**/scripts/configsEdit.ts',
  '**/scripts/theme.ts',
  '**/manifest-chrome.json',
  '**/manifest-firefox.json',
];

const folderIgnore = ['**/chrome/**', '**/firefox/**', '**/manifest.json'];

const manifestTransform = content => {
  const filteredContent = content
    .toString()
    .split('\n')
    .filter(str => !str.trimStart().startsWith('//'))
    .join('\n');

  const manifestData = JSON.parse(filteredContent);
  manifestData.version = extensionVersion;
  return JSON.stringify(manifestData, null, 2);
};

export default {
  entry: {
    leetcode: path.resolve(__dirname, 'scripts', 'leetcode', 'leetcode.js'),
    welcome: './scripts/welcome.js',
    popup: './scripts/popup.js',
    background: './scripts/background.js',
  },
  watchOptions: {
    ignored: '**/dist/**',
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    // Source imports keep the explicit ESM `.js` specifier even once a file is `.ts` on
    // disk (the specifier names the future compiled output, standard TS+webpack ESM
    // pattern) - without this, an import like `./util.js` fails to resolve once `util.js`
    // is renamed to `util.ts`.
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(test)|(spec)\.js$/,
        use: 'ignore-loader',
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: './scripts',
          to: './scripts',
          globOptions: {
            ignore,
          },
        },
        {
          from: '*',
          globOptions: {
            gitignore: true,
            ignore,
          },
        },
        {
          from: './manifest-chrome.json',
          to: './manifest.json',
          transform: manifestTransform,
        },
        {
          from: './manifest-chrome.json',
          to: './chrome/manifest.json',
          transform: manifestTransform,
        },
        {
          from: './manifest-firefox.json',
          to: './firefox/manifest.json',
          transform: manifestTransform,
        },
        {
          from: 'assets/**',
          globOptions: {
            ignore: [...ignore, './assets/.DS_Store'],
          },
        },
        {
          from: 'css',
          to: 'css',
          globOptions: {
            ignore,
          },
        },
      ],
    }),
    new FileManagerPlugin({
      events: {
        onEnd: {
          move: [
            {
              source: './dist/leetcode.js',
              destination: './dist/scripts/leetcode.js',
            },
            {
              source: './dist/welcome.js',
              destination: './dist/scripts/welcome.js',
            },
            {
              source: './dist/popup.js',
              destination: './dist/scripts/popup.js',
            },
            {
              source: './dist/background.js',
              destination: './dist/scripts/background.js',
            },
          ],
          copy: [
            // Copy everything to chrome and firefox
            {
              source: './dist/**',
              destination: './dist/chrome',
              globOptions: {
                ignore: folderIgnore,
              },
            },
            {
              source: './dist/**',
              destination: './dist/firefox',
              globOptions: {
                ignore: folderIgnore,
              },
            },
          ],
        },
      },
    }),
  ],
};
