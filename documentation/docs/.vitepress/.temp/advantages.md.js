import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Why EonSwap?","description":"","frontmatter":{},"headers":[],"relativePath":"advantages.md","filePath":"advantages.md","lastUpdated":1776425383000}');
const _sfc_main = { name: "advantages.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="why-eonswap" tabindex="-1">Why EonSwap? <a class="header-anchor" href="#why-eonswap" aria-label="Permalink to &quot;Why EonSwap?&quot;">​</a></h1><h2 id="non-custodial" tabindex="-1">Non-Custodial <a class="header-anchor" href="#non-custodial" aria-label="Permalink to &quot;Non-Custodial&quot;">​</a></h2><p>Your funds stay in your wallet. EonSwap never has access to your tokens — every transaction requires your explicit signature.</p><h2 id="built-on-base" tabindex="-1">Built on Base <a class="header-anchor" href="#built-on-base" aria-label="Permalink to &quot;Built on Base&quot;">​</a></h2><p>Leverage Base&#39;s low fees and fast transactions. Average swap costs less than $0.01 in gas fees.</p><h2 id="dual-reward-farming" tabindex="-1">Dual Reward Farming <a class="header-anchor" href="#dual-reward-farming" aria-label="Permalink to &quot;Dual Reward Farming&quot;">​</a></h2><p>Earn both ESTF and ESR tokens when you farm. Double the rewards, double the opportunities.</p><h2 id="fair-token-distribution" tabindex="-1">Fair Token Distribution <a class="header-anchor" href="#fair-token-distribution" aria-label="Permalink to &quot;Fair Token Distribution&quot;">​</a></h2><ul><li>40% to community farming rewards</li><li>10% community airdrops</li><li>Team tokens are vested with 12-month cliff</li></ul><h2 id="transparent-verified" tabindex="-1">Transparent &amp; Verified <a class="header-anchor" href="#transparent-verified" aria-label="Permalink to &quot;Transparent &amp; Verified&quot;">​</a></h2><p>All smart contracts are:</p><ul><li>Open source</li><li>Verified on BaseScan</li><li>Auditable by anyone</li></ul><h2 id="low-fees" tabindex="-1">Low Fees <a class="header-anchor" href="#low-fees" aria-label="Permalink to &quot;Low Fees&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Action</th><th>Fee</th></tr></thead><tbody><tr><td>Swap</td><td>0.3% (to LPs)</td></tr><tr><td>Add Liquidity</td><td>Gas only</td></tr><tr><td>Farm Stake/Unstake</td><td>Gas only</td></tr><tr><td>Claim Rewards</td><td>Gas only</td></tr></tbody></table><h2 id="complete-defi-suite" tabindex="-1">Complete DeFi Suite <a class="header-anchor" href="#complete-defi-suite" aria-label="Permalink to &quot;Complete DeFi Suite&quot;">​</a></h2><p>Everything you need in one place:</p><ul><li>Swap tokens</li><li>Provide liquidity</li><li>Farm for rewards</li><li>Stake for benefits</li><li>Track activity</li><li>Monitor system status</li></ul><h2 id="community-first" tabindex="-1">Community First <a class="header-anchor" href="#community-first" aria-label="Permalink to &quot;Community First&quot;">​</a></h2><ul><li>Governance voting for ESTF holders</li><li>Community airdrops</li><li>Referral rewards</li><li>Active Discord and Telegram</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("advantages.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const advantages = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  advantages as default
};
