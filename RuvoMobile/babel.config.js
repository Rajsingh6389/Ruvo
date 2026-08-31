module.exports = function (api) {
  api.cache(true);

  function nativewindPreset(api, opts) {
    const preset = require('nativewind/babel')(api, opts);
    return {
      ...preset,
      plugins: (preset.plugins || []).filter(plugin => {
        const name = Array.isArray(plugin) ? plugin[0] : plugin;
        if (typeof name === 'string') {
          try {
            require.resolve(name);
          } catch {
            return false;
          }
        }
        return true;
      }),
    };
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      nativewindPreset,
    ],
    plugins: ['react-native-worklets/plugin'],
  };
};
