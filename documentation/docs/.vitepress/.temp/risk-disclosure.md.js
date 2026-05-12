import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Risk Disclosure","description":"","frontmatter":{},"headers":[],"relativePath":"risk-disclosure.md","filePath":"risk-disclosure.md","lastUpdated":1776425383000}');
const _sfc_main = { name: "risk-disclosure.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="risk-disclosure" tabindex="-1">Risk Disclosure <a class="header-anchor" href="#risk-disclosure" aria-label="Permalink to &quot;Risk Disclosure&quot;">​</a></h1><p>Using EonSwap involves blockchain and market risk. Please read this page before you trade or swap.</p><h2 id="core-risks" tabindex="-1">Core Risks <a class="header-anchor" href="#core-risks" aria-label="Permalink to &quot;Core Risks&quot;">​</a></h2><ul><li><strong>Price movement:</strong> token prices can change quickly between quote and execution.</li><li><strong>Slippage:</strong> execution price may be worse than the quoted price in volatile markets.</li><li><strong>Network congestion:</strong> gas spikes and chain congestion can delay or fail transactions.</li><li><strong>Swap delay:</strong> cross-chain transfers may take longer during heavy network traffic.</li><li><strong>Protocol risk:</strong> smart contracts and third-party protocols can contain vulnerabilities.</li></ul><h2 id="what-this-means-for-you" tabindex="-1">What This Means for You <a class="header-anchor" href="#what-this-means-for-you" aria-label="Permalink to &quot;What This Means for You&quot;">​</a></h2><ul><li>Transactions are generally irreversible once confirmed on-chain.</li><li>Failed transactions may still consume network fees.</li><li>Swap and swap outcomes depend on live chain and liquidity conditions.</li></ul><h2 id="safety-checklist" tabindex="-1">Safety Checklist <a class="header-anchor" href="#safety-checklist" aria-label="Permalink to &quot;Safety Checklist&quot;">​</a></h2><ul><li>Verify token, chain, and amount before confirming.</li><li>Keep a reasonable slippage setting for market conditions.</li><li>Start with a small test amount for new routes or chains.</li><li>Keep extra native gas token on both source and destination chains.</li><li>Use only official EonSwap links and trusted wallets.</li></ul><h2 id="support" tabindex="-1">Support <a class="header-anchor" href="#support" aria-label="Permalink to &quot;Support&quot;">​</a></h2><p>If a transaction seems delayed, use the transaction hash first and then follow the <a href="/docs/guides/troubleshooting">Troubleshooting</a> page.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("risk-disclosure.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const riskDisclosure = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  riskDisclosure as default
};
