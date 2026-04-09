<template>
  <footer class="eonswap-docs-footer">
    <div class="eonswap-docs-footer__inner">
      <p class="eonswap-docs-footer__message">
        Powered by EonSwap · <a href="/docs/terms">Terms</a> ·
        <a href="/docs/privacy">Privacy</a> ·
        <a href="https://eonswap.us/contact-support" target="_blank" rel="noopener noreferrer">Contact</a> ·
        <a href="https://x.com/eonswapus" target="_blank" rel="noopener noreferrer">X</a> ·
        <a href="https://t.me/eonswap" target="_blank" rel="noopener noreferrer">Telegram</a>
      </p>
      <p class="eonswap-docs-footer__copyright">
        Copyright © {{ year }} EonSwap. All rights reserved.
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped>
.eonswap-docs-footer {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 2rem;
  padding: 1rem 0 2rem;
}

.eonswap-docs-footer__inner {
  margin: 0 auto;
  max-width: var(--vp-layout-max-width);
  padding: 0 24px;
}

.eonswap-docs-footer__message {
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin: 0;
}

.eonswap-docs-footer__message a {
  color: inherit;
  text-decoration: underline;
}

.eonswap-docs-footer__copyright {
  color: var(--vp-c-text-3);
  font-size: 12px;
  margin: 4px 0 0;
}
</style>
