import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Security Best Practices","description":"","frontmatter":{},"headers":[],"relativePath":"guides/security.md","filePath":"guides/security.md","lastUpdated":1775670099000}');
const _sfc_main = { name: "guides/security.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="security-best-practices" tabindex="-1">Security Best Practices <a class="header-anchor" href="#security-best-practices" aria-label="Permalink to &quot;Security Best Practices&quot;">​</a></h1><h2 id="always-do-these-checks" tabindex="-1">Always do these checks <a class="header-anchor" href="#always-do-these-checks" aria-label="Permalink to &quot;Always do these checks&quot;">​</a></h2><ul><li>Confirm you are on the official domain.</li><li>Verify token, amount, and network before signing.</li><li>Read wallet prompts carefully before confirmation.</li></ul><h2 id="never-do-these-actions" tabindex="-1">Never do these actions <a class="header-anchor" href="#never-do-these-actions" aria-label="Permalink to &quot;Never do these actions&quot;">​</a></h2><ul><li>Never share seed phrase.</li><li>Never share private key.</li><li>Never approve unknown prompts from suspicious pages.</li></ul><h2 id="safety-recommendation" tabindex="-1">Safety recommendation <a class="header-anchor" href="#safety-recommendation" aria-label="Permalink to &quot;Safety recommendation&quot;">​</a></h2><p>For new wallets or new routes, test with a small amount first.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guides/security.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const security = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  security as default
};
