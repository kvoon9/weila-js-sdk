import { ref } from 'vue';
const sdkStatus = ref('idle');
const statusMessage = ref('');
async function initSDK() {
  sdkStatus.value = 'loading';
  statusMessage.value = '正在加载 SDK...';
  try {
    // 动态导入 SDK，使用 markRaw 避免 Vue Proxy 包裹
    const { markRaw } = await import('vue');
    const weilaModule = await import('@weilasdk/core');
    statusMessage.value = 'SDK 模块加载成功 ✓';
    sdkStatus.value = 'ready';
    console.log('[Playground] SDK module loaded:', weilaModule);
  } catch (e) {
    sdkStatus.value = 'error';
    statusMessage.value = `SDK 加载失败: ${e}`;
    console.error('[Playground] SDK load error:', e);
  }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['status']} */ /** @type {__VLS_StyleScopedClasses['status']} */ /** @type {__VLS_StyleScopedClasses['status']} */ // CSS variable injection
// CSS variable injection end
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: 'container' },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.p,
  __VLS_intrinsicElements.p,
)({
  ...{ class: 'subtitle' },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: 'card' },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.button,
  __VLS_intrinsicElements.button,
)({
  ...{ onClick: __VLS_ctx.initSDK },
  disabled: __VLS_ctx.sdkStatus === 'loading',
});
__VLS_ctx.sdkStatus === 'idle' ? '初始化 SDK' : '重新加载';
if (__VLS_ctx.statusMessage) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({
    ...{ class: ['status', __VLS_ctx.sdkStatus] },
  });
  __VLS_ctx.statusMessage;
}
/** @type {__VLS_StyleScopedClasses['container']} */ /** @type {__VLS_StyleScopedClasses['subtitle']} */ /** @type {__VLS_StyleScopedClasses['card']} */ var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
  setup() {
    return {
      sdkStatus: sdkStatus,
      statusMessage: statusMessage,
      initSDK: initSDK,
    };
  },
});
export default (await import('vue')).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
