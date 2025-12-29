module.exports = {
  packagerConfig: {
    name: 'Emigration Copilot Demo',
    executableName: 'emigration-copilot-demo',
    asar: {
      unpack: '**/node_modules/playwright-core/**',
    },
    icon: './resources/icon',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'emigration_copilot_demo',
        authors: 'Nikhil Sahu',
        description: 'Emigration Copilot Demo - Automation Tool',
        setupExe: 'EmigrationCopilotDemo-Setup.exe',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
  ],
};
