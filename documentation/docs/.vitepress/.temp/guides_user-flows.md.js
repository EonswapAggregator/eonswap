import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"User Flows","description":"","frontmatter":{},"headers":[],"relativePath":"guides/user-flows.md","filePath":"guides/user-flows.md","lastUpdated":1776425383000}');
const _sfc_main = { name: "guides/user-flows.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="user-flows" tabindex="-1">User Flows <a class="header-anchor" href="#user-flows" aria-label="Permalink to &quot;User Flows&quot;">​</a></h1><h2 id="flow-a-swap" tabindex="-1">Flow A: Swap <a class="header-anchor" href="#flow-a-swap" aria-label="Permalink to &quot;Flow A: Swap&quot;">​</a></h2><ol><li>Connect wallet.</li><li>Choose sell and buy token.</li><li>Enter amount and review quote.</li><li>Confirm wallet transaction.</li><li>Monitor status until completed.</li></ol><h2 id="flow-b-swap" tabindex="-1">Flow B: Swap <a class="header-anchor" href="#flow-b-swap" aria-label="Permalink to &quot;Flow B: Swap&quot;">​</a></h2><ol><li>Choose source and destination chain.</li><li>Select tokens and amount.</li><li>Review ETA and fee estimate.</li><li>Confirm source-chain transaction.</li><li>Track progress until final state.</li></ol><h2 id="flow-c-verify-transaction" tabindex="-1">Flow C: Verify transaction <a class="header-anchor" href="#flow-c-verify-transaction" aria-label="Permalink to &quot;Flow C: Verify transaction&quot;">​</a></h2><ol><li>Open Status page.</li><li>Enter transaction hash.</li><li>Review current state and next action.</li></ol></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guides/user-flows.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const userFlows = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  userFlows as default
};
