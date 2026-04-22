const i18n = {
  defaultLocale: "en",
  locales: ["en", "hi", "bn", "ta", "te"],
};

module.exports = {
  i18n,
  reloadOnPrerender: process.env.NODE_ENV === "development",
};
