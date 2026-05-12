import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Terms of Service","description":"","frontmatter":{},"headers":[],"relativePath":"terms.md","filePath":"terms.md","lastUpdated":1776425383000}');
const _sfc_main = { name: "terms.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="terms-of-service" tabindex="-1">Terms of Service <a class="header-anchor" href="#terms-of-service" aria-label="Permalink to &quot;Terms of Service&quot;">​</a></h1><p>Last updated: April 8, 2026</p><p>By accessing or using EonSwap, you agree to these terms.</p><h2 id="service-description" tabindex="-1">Service Description <a class="header-anchor" href="#service-description" aria-label="Permalink to &quot;Service Description&quot;">​</a></h2><p>EonSwap provides interfaces and tools to access decentralized swap functionality. EonSwap does not custody user funds.</p><h2 id="user-responsibilities" tabindex="-1">User Responsibilities <a class="header-anchor" href="#user-responsibilities" aria-label="Permalink to &quot;User Responsibilities&quot;">​</a></h2><ul><li>You are responsible for securing your wallet, private keys, and seed phrase.</li><li>You are responsible for reviewing transaction details before confirming on-chain actions.</li><li>You agree to use the service in compliance with applicable laws.</li></ul><h2 id="risk-disclosure" tabindex="-1">Risk Disclosure <a class="header-anchor" href="#risk-disclosure" aria-label="Permalink to &quot;Risk Disclosure&quot;">​</a></h2><p>Blockchain transactions are irreversible and may involve smart contract, market, swap, and network risks. You accept these risks when using the service.</p><h2 id="availability" tabindex="-1">Availability <a class="header-anchor" href="#availability" aria-label="Permalink to &quot;Availability&quot;">​</a></h2><p>EonSwap may update, suspend, or discontinue features at any time to maintain security and product quality.</p><h2 id="third-party-integrations" tabindex="-1">Third-Party Integrations <a class="header-anchor" href="#third-party-integrations" aria-label="Permalink to &quot;Third-Party Integrations&quot;">​</a></h2><p>Some features rely on third-party protocols or infrastructure. EonSwap is not responsible for third-party outages, pricing, or policy changes.</p><h2 id="limitation-of-liability" tabindex="-1">Limitation of Liability <a class="header-anchor" href="#limitation-of-liability" aria-label="Permalink to &quot;Limitation of Liability&quot;">​</a></h2><p>To the maximum extent allowed by law, EonSwap is provided &quot;as is&quot; without guarantees, and liability is limited for losses arising from use of the service.</p><h2 id="changes-to-terms" tabindex="-1">Changes to Terms <a class="header-anchor" href="#changes-to-terms" aria-label="Permalink to &quot;Changes to Terms&quot;">​</a></h2><p>We may revise these terms from time to time. Continued use after updates means you accept the revised terms.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("terms.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const terms = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  terms as default
};
