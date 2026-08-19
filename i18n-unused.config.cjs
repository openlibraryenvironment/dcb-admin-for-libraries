/** @type {import('i18n-unused').RunOptions} */
module.exports = {
	localesPath: "src/locales/en",
	srcPath: "src",
	translationKeyMatcher: /(?:[$ \t(,.{[](_|t|tc|i18nKey))\(.*?\)/gis,
};
// .cjs, not .js: this package is "type": "module", so a .js config is ESM and
// module.exports throws. i18n-unused looks for js, then cjs, then json, and
// stops at the first file that EXISTS - so a stray .js alongside this would
// break the tool rather than fall through to it.
//
// Gnarly regex in translationKeyMatcher is intended to catch the various
// presentations (such as multi-lines) of our translation keys and t functions.
// The class must include tab, "(" and ",": this codebase indents with tabs, so a
// t("key") on its own argument line, or passed as fn(t("key"), x), was being
// missed and reported as an unused key that is very much in use.
