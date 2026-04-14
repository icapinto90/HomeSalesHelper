module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: process.env.NODE_ENV === 'test' ? [] : [
      'react-native-reanimated/plugin',
    ],
  };
};
