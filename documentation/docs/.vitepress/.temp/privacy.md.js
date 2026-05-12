import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Privacy Policy","description":"","frontmatter":{},"headers":[],"relativePath":"privacy.md","filePath":"privacy.md","lastUpdated":1776425383000}');
const _sfc_main = { name: "privacy.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="privacy-policy" tabindex="-1">Privacy Policy <a class="header-anchor" href="#privacy-policy" aria-label="Permalink to &quot;Privacy Policy&quot;">​</a></h1><p>Last updated: April 8, 2026</p><p>This page explains how EonSwap handles information when you use the website and related services.</p><h2 id="information-we-process" tabindex="-1">Information We Process <a class="header-anchor" href="#information-we-process" aria-label="Permalink to &quot;Information We Process&quot;">​</a></h2><ul><li>Wallet addresses and public on-chain transaction data needed to provide swap flows.</li><li>Technical data such as browser type, device type, and basic usage logs for reliability and security.</li><li>Optional support information you choose to provide.</li></ul><h2 id="how-we-use-information" tabindex="-1">How We Use Information <a class="header-anchor" href="#how-we-use-information" aria-label="Permalink to &quot;How We Use Information&quot;">​</a></h2><ul><li>Operate core product features (quotes, routes, transaction tracking).</li><li>Improve performance, reliability, and user experience.</li><li>Detect abuse, fraud, and security threats.</li><li>Comply with applicable legal obligations.</li></ul><h2 id="data-retention" tabindex="-1">Data Retention <a class="header-anchor" href="#data-retention" aria-label="Permalink to &quot;Data Retention&quot;">​</a></h2><p>We keep data only as long as needed for service operation, security, analytics, and legal compliance.</p><h2 id="third-party-services" tabindex="-1">Third-Party Services <a class="header-anchor" href="#third-party-services" aria-label="Permalink to &quot;Third-Party Services&quot;">​</a></h2><p>EonSwap may integrate third-party providers for routing, analytics, RPC, and infrastructure. Their policies apply to data handled on their systems.</p><h2 id="security" tabindex="-1">Security <a class="header-anchor" href="#security" aria-label="Permalink to &quot;Security&quot;">​</a></h2><p>We apply reasonable technical and operational controls to protect systems and user data. No internet service can guarantee absolute security.</p><h2 id="contact" tabindex="-1">Contact <a class="header-anchor" href="#contact" aria-label="Permalink to &quot;Contact&quot;">​</a></h2><p>For privacy questions, use <strong><a href="https://eonswap.us/contact-support" target="_blank" rel="noreferrer">Contact support</a></strong> on the main website.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("privacy.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const privacy = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  privacy as default
};
