// ==UserScript==
// @name         AI Prompt Suffix Injector (Master Script v2)
// @namespace    https://z.ai/userscripts/ai-suffix-injector
// @version      2.0.0
// @description  Appends a configurable suffix (e.g. "[[[[[ give me a structured and eye candy reply]]]]]") to EVERY prompt you send on 25+ AI chat sites — ChatGPT, Gemini, DeepSeek, Qwen, Claude, Grok, Mistral, Perplexity, HuggingChat, Pi, Copilot, You, Cohere, OpenRouter, Poe, Character.AI, Reka, AI Studio, NotebookLM, Kimi, ChatGLM, Baichuan, Yi, Spark, Hunyuan, Yiyan, Doubao, Cursor. Live ghost preview shows the suffix faded inside your writing area.
// @author       Z.ai
// @license      MIT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://gemini.google.com/*
// @match        https://chat.deepseek.com/*
// @match        https://chat.qwen.ai/*
// @match        https://tongyi.aliyun.com/*
// @match        https://claude.ai/*
// @match        https://grok.com/*
// @match        https://chat.mistral.ai/*
// @match        https://chat.le.ai/*
// @match        https://www.perplexity.ai/*
// @match        https://huggingface.co/chat*
// @match        https://pi.ai/*
// @match        https://copilot.microsoft.com/*
// @match        https://copilot.cloud.microsoft.com/*
// @match        https://you.com/*
// @match        https://coral.cohere.com/*
// @match        https://openrouter.ai/*
// @match        https://poe.com/*
// @match        https://character.ai/*
// @match        https://chat.reka.ai/*
// @match        https://aistudio.google.com/*
// @match        https://notebooklm.google.com/*
// @match        https://kimi.com/*
// @match        https://kimi.moonshot.cn/*
// @match        https://chatglm.cn/*
// @match        https://chat.glm.ai/*
// @match        https://www.baichuan-ai.com/*
// @match        https://platform.lingyiwanwu.com/*
// @match        https://www.chat-on-ai.com/*
// @match        https://xinghuo.xunfei.cn/*
// @match        https://hunyuan.tencent.com/*
// @match        https://yuanbao.tencent.com/*
// @match        https://yiyan.baidu.com/*
// @match        https://www.doubao.com/*
// @match        https://www.cursor.com/*
// @match        https://cursor.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════════════
   *  ⚙  CONFIG  — edit SUFFIX to change the appended text
   * ════════════════════════════════════════════════════════════════════════ */
  const SUFFIX          = '[[[[[ give me a structured and eye candy reply]]]]]';
  const TOGGLE_COMBO    = { ctrl: true, shift: true, key: 'S' };   // Ctrl+Shift+S = ON/OFF
  const SHOW_BADGE      = true;                                    // corner status pill
  const SHOW_GHOST      = true;                                    // faded preview inside input

  /* ════════════════════════════════════════════════════════════════════════
   *  🌐  PER-SITE SELECTORS
   * ════════════════════════════════════════════════════════════════════════
   *  Tier 1 = VERIFIED  (agent-browser live snapshot or GreasyFork reference)
   *  Tier 2 = EDUCATED  (matches the site's known framework + universal patterns)
   *
   *  Universal fallback patterns used everywhere:
   *    input  →  textarea (non-readonly) | [contenteditable=true][role=textbox] |
   *              .ProseMirror[contenteditable] | .ql-editor[contenteditable]
   *    submit →  button[aria-label*=Send] | button[type=submit] |
   *              button[data-testid*=send] | div[role=button][aria-label*=Send]
   */
  const UNIVERSAL_INPUT  = 'textarea:not([readonly]):not([disabled]):not([type="hidden"]):not([aria-hidden="true"]), ' +
                           '[contenteditable="true"][role="textbox"], ' +
                           '[contenteditable="true"][aria-label*="prompt" i], ' +
                           '[contenteditable="true"][aria-label*="message" i], ' +
                           '[contenteditable="true"][aria-label*="ask" i], ' +
                           '.ProseMirror[contenteditable="true"], ' +
                           '.ql-editor[contenteditable="true"]';

  const UNIVERSAL_SUBMIT = 'button[data-testid="send-button" i], ' +
                           'button[aria-label*="Send" i], ' +
                           'button[aria-label*="发送" i], ' +
                           'button[type="submit"], ' +
                           'button[data-testid*="send" i], ' +
                           'div[role="button"][aria-label*="Send" i], ' +
                           'button.send-button, ' +
                           'button[aria-label*="Submit" i], ' +
                           'button[mattooltip*="Send" i]';

  const SITES = {
    /* ── Tier 1: VERIFIED ──────────────────────────────────────────────── */
    chatgpt: {
      host:   [/chatgpt\.com$/, /chat\.openai\.com$/],
      input:  '#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][data-id], .ProseMirror[contenteditable="true"]',
      submit: 'button[data-testid="send-button"], button[aria-label*="Send" i], form button[type="submit"]',
    },
    gemini: {
      host:   [/gemini\.google\.com$/],
      input:  '.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][aria-label*="prompt" i]',
      submit: 'button[aria-label*="Send" i], button.send-button, button[mattooltip*="Send" i], button[type="submit"]',
    },
    deepseek: {
      host:   [/chat\.deepseek\.com$/],
      input:  'textarea[name="search"]',
      submit: 'div[role="button"].ds-button--primary.ds-button--circle',
    },
    qwen: {
      host:   [/chat\.qwen\.ai$/, /tongyi\.aliyun\.com$/],
      input:  'textarea.message-input-textarea, textarea[placeholder*="How can I help" i]',
      submit: 'button:has(.icon-send), button[aria-label*="Send" i], button[type="submit"]',
    },
    claude: {
      host:   [/claude\.ai$/],
      input:  '.ProseMirror[contenteditable="true"], div[data-placeholder][contenteditable="true"]',
      submit: 'button[data-testid="send-button"], button[aria-label*="Send message" i], button[aria-label="Send" i]',
    },

    /* ── Tier 2: EDUCATED (universal patterns) ────────────────────────── */
    grok: {
      host:   [/grok\.com$/, /grok\.x\.ai$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    mistral: {
      host:   [/chat\.mistral\.ai$/, /chat\.le\.ai$/],
      input:  'textarea[aria-label*="Ask" i], textarea[placeholder*="Ask" i], ' + UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    perplexity: {
      host:   [/perplexity\.ai$/],
      input:  'textarea[aria-label*="Ask" i], textarea[aria-label*="Question" i], textarea[placeholder*="Ask" i], ' + UNIVERSAL_INPUT,
      submit: 'button[aria-label*="Submit" i], button[type="submit"], button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    huggingchat: {
      host:   [/huggingface\.co\/chat/],
      input:  'textarea[placeholder], ' + UNIVERSAL_INPUT,
      submit: 'button[type="submit"], button.bg-gradient-to-r, ' + UNIVERSAL_SUBMIT,
    },
    pi: {
      host:   [/pi\.ai$/],
      input:  'textarea[aria-label*="Message" i], ' + UNIVERSAL_INPUT,
      submit: 'button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    copilot: {
      host:   [/copilot\.microsoft\.com$/, /copilot\.cloud\.microsoft$/],
      input:  'textarea#search-input, textarea[aria-label*="ask" i], ' + UNIVERSAL_INPUT,
      submit: 'button#submission-button, button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    you: {
      host:   [/you\.com$/],
      input:  'textarea#search, textarea[aria-label*="Ask" i], ' + UNIVERSAL_INPUT,
      submit: 'button#search-button, button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    cohere: {
      host:   [/coral\.cohere\.com$/, /cohere\.com/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    openrouter: {
      host:   [/openrouter\.ai$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    poe: {
      host:   [/poe\.com$/],
      input:  'textarea[aria-label*="Message" i], ' + UNIVERSAL_INPUT,
      submit: 'button[data-testid*="send" i], button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    character: {
      host:   [/character\.ai$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    reka: {
      host:   [/chat\.reka\.ai$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    aistudio: {
      host:   [/aistudio\.google\.com$/],
      input:  'textarea[aria-label*="prompt" i], ' + UNIVERSAL_INPUT,
      submit: 'button[aria-label*="Run" i], ' + UNIVERSAL_SUBMIT,
    },
    notebooklm: {
      host:   [/notebooklm\.google\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    kimi: {
      host:   [/kimi\.com$/, /kimi\.moonshot\.cn$/],
      input:  '.chat-textarea, textarea[aria-label*="Message" i], ' + UNIVERSAL_INPUT,
      submit: 'button[aria-label*="Send" i], ' + UNIVERSAL_SUBMIT,
    },
    chatglm: {
      host:   [/chatglm\.cn$/, /chat\.glm\.ai$/, /bigmodel\.cn$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    baichuan: {
      host:   [/baichuan-ai\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    yi: {
      host:   [/lingyiwanwu\.com$/, /platform\.lingyiwanwu\.com$/, /chat-on-ai\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    spark: {
      host:   [/xinghuo\.xunfei\.cn$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    hunyuan: {
      host:   [/hunyuan\.tencent\.com$/, /yuanbao\.tencent\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    yiyan: {
      host:   [/yiyan\.baidu\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    doubao: {
      host:   [/doubao\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
    cursor: {
      host:   [/cursor\.com$/, /www\.cursor\.com$/],
      input:  UNIVERSAL_INPUT,
      submit: UNIVERSAL_SUBMIT,
    },
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  🧠  STATE
   * ════════════════════════════════════════════════════════════════════════ */
  const STORAGE_KEY        = '__ai_suffix_enabled__';
  const SUFFIX_LEADING_SPACE = ' ' + SUFFIX;
  const SUFFIX_MARKER       = SUFFIX.split(/\s+/)[0];   // first token → "already appended" detector
  let   enabled             = localStorage.getItem(STORAGE_KEY) !== 'false';   // default ON
  let   submitting          = false;                   // re-entrancy guard
  const ghostByInput        = new WeakMap();           // input element → ghost overlay div

  /* ════════════════════════════════════════════════════════════════════════
   *  🔧  HELPERS
   * ════════════════════════════════════════════════════════════════════════ */
  function getCurrentSite() {
    const host = location.hostname;
    for (const [name, cfg] of Object.entries(SITES)) {
      if (cfg.host.some(re => re.test(host))) return Object.assign({ name }, cfg);
    }
    return null;
  }

  function getInput(cfg) {
    if (!cfg) return null;
    try { return document.querySelector(cfg.input); } catch (e) { return null; }
  }

  function getSubmit(cfg) {
    if (!cfg) return null;
    let btns = [];
    try { btns = Array.from(document.querySelectorAll(cfg.submit)); } catch (e) { btns = []; }
    for (const b of btns) {
      if (!b.disabled && b.offsetParent !== null) return b;
    }
    return btns[0] || null;
  }

  function getInputValue(input) {
    if (!input) return '';
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') return input.value || '';
    return (input.innerText || input.textContent || '').replace(/\u200b/g, '');
  }

  /* Append suffix to <textarea> / <input>. Uses native prototype setter so
   * React-controlled components actually re-render (the deepseek pattern).   */
  function appendToTextarea(ta, suffix) {
    const proto = ta.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(ta, (ta.value || '') + suffix);
    ta.dispatchEvent(new Event('input',  { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* Append suffix to contenteditable (ProseMirror / Quill / generic).
   * execCommand('insertText') is the only reliable cross-framework way.   */
  function appendToContentEditable(el, suffix) {
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('insertText', false, suffix); } catch (e) { ok = false; }
    if (!ok) {
      const p = document.createElement('span');
      p.textContent = suffix;
      el.appendChild(p);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: suffix, inputType: 'insertText' }));
    }
  }

  function appendSuffixToInput(input, suffix) {
    if (!input) return;
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      appendToTextarea(input, suffix);
    } else {
      appendToContentEditable(input, suffix);
    }
  }

  function triggerSubmit(cfg, input) {
    const btn = getSubmit(cfg);
    if (btn) { btn.click(); return true; }
    if (!input) return false;
    const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    input.dispatchEvent(new KeyboardEvent('keydown',  opts));
    input.dispatchEvent(new KeyboardEvent('keypress', opts));
    input.dispatchEvent(new KeyboardEvent('keyup',    opts));
    return true;
  }

  /* Idempotent: append suffix if not already present.                     */
  function maybeAppend(cfg) {
    const input = getInput(cfg);
    if (!input) return false;
    const val = getInputValue(input);
    if (!val.trim()) return false;
    if (val.indexOf(SUFFIX_MARKER) !== -1) return false;
    appendSuffixToInput(input, SUFFIX_LEADING_SPACE);
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  👻  GHOST SUFFIX OVERLAY  (transparent mirror text + faded gray suffix)
   * ════════════════════════════════════════════════════════════════════════
   *  Strategy: an absolutely-positioned div placed directly over the input.
   *  It mirrors the user's current text as transparent text (so the user's
   *  own text shows through, untouched), then shows the SUFFIX in faded gray
   *  immediately after the last character the user typed. Pure visual —
   *  pointer-events:none so typing & clicks fall through to the real input.
   */
  function buildGhost(input) {
    let ghost = ghostByInput.get(input);
    if (ghost && ghost.isConnected) return ghost;
    ghost = document.createElement('div');
    ghost.setAttribute('data-ai-suffix-ghost', 'true');
    ghost.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'z-index:9999999',
      'border:0 solid transparent',
      'background:transparent',
      'color:transparent',
      'overflow:hidden',
      'white-space:pre-wrap',
      'word-wrap:break-word',
      'word-break:break-word',
      'box-sizing:border-box',
      'margin:0',
      'display:none',
      'max-width:none',
      'max-height:none',
      'min-width:0',
      'min-height:0',
      'transform:none',
      'transition:none',
      'animation:none',
    ].join(';') + ';!important';
    // Make sure parent is a positioning context
    const parent = input.parentElement || document.body;
    if (parent !== document.body && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(ghost);
    ghostByInput.set(input, ghost);
    return ghost;
  }

  function syncGhost(input) {
    if (!enabled || !SHOW_GHOST) { hideGhost(input); return; }
    const cfg = getCurrentSite();
    if (!cfg) return;
    let matchesCfg = false;
    try { matchesCfg = input.matches(cfg.input); } catch (e) { matchesCfg = false; }
    if (!matchesCfg) return;

    const ghost = buildGhost(input);
    // Sync computed text-rendering styles
    const cs = window.getComputedStyle(input);
    ['fontFamily','fontSize','fontWeight','fontStyle','fontVariant',
     'letterSpacing','lineHeight','padding','boxSizing',
     'textIndent','wordSpacing','textTransform','tabSize',
     'webkitTextFillColor','webkitTextSecurity'].forEach(p => {
      try { ghost.style[p] = cs[p]; } catch (e) {}
    });
    // Match dimensions + position relative to the parent (which we made relative)
    const rect     = input.getBoundingClientRect();
    const parentEl = input.parentElement || document.body;
    const parentR  = parentEl.getBoundingClientRect();
    ghost.style.left   = (rect.left - parentR.left) + 'px';
    ghost.style.top    = (rect.top  - parentR.top)  + 'px';
    ghost.style.width  = input.clientWidth  + 'px';
    ghost.style.height = input.clientHeight + 'px';

    const userText = getInputValue(input);
    if (!userText.trim() || userText.indexOf(SUFFIX_MARKER) !== -1) {
      ghost.style.display = 'none';
      return;
    }

    ghost.innerHTML = '';
    const userSpan = document.createElement('span');
    userSpan.setAttribute('data-ai-suffix-user', 'true');
    userSpan.style.cssText = 'color:transparent !important; white-space:pre-wrap !important;';
    userSpan.textContent = userText;
    ghost.appendChild(userSpan);

    const sufSpan = document.createElement('span');
    sufSpan.setAttribute('data-ai-suffix-text', 'true');
    sufSpan.style.cssText =
      'color:rgba(120,120,135,0.55) !important;' +
      'font-style:italic !important;' +
      'user-select:none !important;' +
      'pointer-events:none !important;' +
      'white-space:pre !important;' +
      'background:transparent !important;' +
      'text-shadow:none !important;';
    sufSpan.textContent = SUFFIX_LEADING_SPACE;
    ghost.appendChild(sufSpan);

    ghost.style.display = 'block';
  }

  function hideGhost(input) {
    const ghost = ghostByInput.get(input);
    if (ghost) ghost.style.display = 'none';
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  ⚡  INTERCEPTION  (capture-phase, registered at document-start)
   * ════════════════════════════════════════════════════════════════════════ */
  function onKeydown(e) {
    if (!enabled || submitting) return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

    const cfg = getCurrentSite();
    if (!cfg) return;

    let input = null;
    try { input = e.target.closest(cfg.input); } catch (err) { input = null; }
    if (!input) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    submitting = true;
    hideGhost(input);
    window.setTimeout(() => {
      maybeAppend(cfg);
      window.setTimeout(() => {
        triggerSubmit(cfg, input);
        window.setTimeout(() => {
          submitting = false;
          syncGhost(getInput(cfg));   // re-show ghost for next prompt
        }, 300);
      }, 80);
    }, 0);
  }

  function onClick(e) {
    if (!enabled || submitting) return;
    const cfg = getCurrentSite();
    if (!cfg) return;

    let btn = null;
    try { btn = e.target.closest(cfg.submit); } catch (err) { btn = null; }
    if (!btn) return;

    const input = getInput(cfg);
    if (!input) return;
    const val = getInputValue(input);
    if (!val.trim()) return;
    if (val.indexOf(SUFFIX_MARKER) !== -1) return;     // already suffixed → let normal click proceed

    e.preventDefault();
    e.stopImmediatePropagation();

    submitting = true;
    hideGhost(input);
    window.setTimeout(() => {
      maybeAppend(cfg);
      window.setTimeout(() => {
        triggerSubmit(cfg, input);
        window.setTimeout(() => {
          submitting = false;
          syncGhost(getInput(cfg));
        }, 300);
      }, 80);
    }, 0);
  }

  document.addEventListener('keydown', onKeydown, true);   // capture
  document.addEventListener('click',    onClick, true);    // capture

  /* ════════════════════════════════════════════════════════════════════════
   *  👻  GHOST — keep in sync on every input / focus change
   * ════════════════════════════════════════════════════════════════════════ */
  function onInput(e) {
    if (!enabled || submitting) return;
    const cfg = getCurrentSite();
    if (!cfg) return;
    let input = null;
    try { input = e.target.closest(cfg.input); } catch (err) { return; }
    if (!input) return;
    syncGhost(input);
  }

  function onFocus(e) {
    if (!enabled) return;
    const cfg = getCurrentSite();
    if (!cfg) return;
    let input = null;
    try { input = e.target.closest(cfg.input); } catch (err) { return; }
    if (input) syncGhost(input);
  }

  document.addEventListener('input',  onInput,  true);
  document.addEventListener('focus',  onFocus, true, true);

  /* Re-sync ghost on viewport changes (resize, scroll, SPA layout shift). */
  let layoutT;
  window.addEventListener('resize', () => {
    clearTimeout(layoutT); layoutT = setTimeout(resyncAllGhosts, 100);
  });
  window.addEventListener('scroll', () => {
    clearTimeout(layoutT); layoutT = setTimeout(resyncAllGhosts, 100);
  }, true);
  function resyncAllGhosts() {
    if (!enabled || !SHOW_GHOST) return;
    const cfg = getCurrentSite();
    if (!cfg) return;
    ghostByInput.forEach((g, input) => { if (g.isConnected) syncGhost(input); });
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  🎚  TOGGLE SHORTCUT  (Ctrl+Shift+S)
   * ════════════════════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', (e) => {
    const w = TOGGLE_COMBO;
    if (!w.ctrl !== !e.ctrlKey)  return;
    if ( w.shift !==  e.shiftKey) return;
    if (!w.alt  !== !e.altKey)   return;
    if (!w.meta !== !e.metaKey)  return;
    if (e.key.toLowerCase() !== String(w.key).toLowerCase()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    enabled = !enabled;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false'); } catch (err) {}
    updateBadge();
    if (!enabled) ghostByInput.forEach(g => { if (g.isConnected) g.style.display = 'none'; });
    else resyncAllGhosts();
    console.log('%c[AI Suffix Injector] ' + (enabled ? 'ENABLED' : 'DISABLED'),
                'color:' + (enabled ? '#2bd576' : '#ff6b6b') + ';font-weight:bold');
  });

  /* ════════════════════════════════════════════════════════════════════════
   *  🏷  STATUS BADGE  (small corner indicator, respawned on SPA re-renders)
   * ════════════════════════════════════════════════════════════════════════ */
  const BADGE_ID = '__ai_suffix_badge__';
  let badge = null;
  function buildBadge() {
    if (!SHOW_BADGE) return;
    if (document.getElementById(BADGE_ID)) { badge = document.getElementById(BADGE_ID); return; }
    badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.style.cssText = [
      'position:fixed','bottom:14px','right:14px','z-index:2147483647',
      'padding:6px 11px','border-radius:10px',
      'font:600 11px/1.4 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'color:#fff','background:rgba(20,20,30,0.82)',
      'border:1px solid rgba(255,255,255,0.18)',
      'box-shadow:0 6px 18px rgba(0,0,0,0.30)',
      'pointer-events:none','user-select:none',
      'backdrop-filter:blur(8px)','-webkit-backdrop-filter:blur(8px)',
      'letter-spacing:0.3px','transition:background 0.25s,opacity 0.25s',
    ].join(';');
    (document.body || document.documentElement).appendChild(badge);
    updateBadge();
  }
  function updateBadge() {
    if (!badge) return;
    badge.textContent = (enabled ? '✦ SUFFIX · ON' : '◯ SUFFIX · OFF');
    badge.style.background = enabled
      ? 'linear-gradient(135deg,rgba(43,213,118,0.92),rgba(34,160,110,0.92))'
      : 'linear-gradient(135deg,rgba(180,40,50,0.85),rgba(120,20,30,0.85))';
    badge.style.opacity = enabled ? '1' : '0.78';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBadge);
  } else { buildBadge(); }

  /* SPA re-renders — respawn badge + re-sync ghost if input re-mounted.      */
  const respawnObs = new MutationObserver(() => {
    if (SHOW_BADGE && !document.getElementById(BADGE_ID)) buildBadge();
    if (enabled && SHOW_GHOST) resyncAllGhosts();
  });
  try { respawnObs.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}

  /* ════════════════════════════════════════════════════════════════════════
   *  📋  BOOT LOG
   * ════════════════════════════════════════════════════════════════════════ */
  const cfgNow = getCurrentSite();
  console.log('%c[AI Suffix Injector] v2.0.0 loaded',
              'color:#2bd576;font-weight:bold;font-size:13px');
  console.log('  site    :', cfgNow ? cfgNow.name : '(no match — script idle)');
  console.log('  suffix  :', JSON.stringify(SUFFIX_LEADING_SPACE));
  console.log('  enabled :', enabled, '(toggle: Ctrl+Shift+' + TOGGLE_COMBO.key.toUpperCase() + ')');
  console.log('  ghost   :', SHOW_GHOST ? 'ON (faded preview in input area)' : 'OFF');
})();
