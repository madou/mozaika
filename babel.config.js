module.exports = function (api) {
  api.cache(true)

  return {
    plugins: ['@compiled/babel-plugin-css-in-js']
  }
}
