// ==UserScript==
// @name         AI Prompt Tail — auto-append suffix to every message
// @namespace    https://github.com/local/ai-prompt-tail
// @version      2.0.0
// @description  Appends a configurable tail (default: "[[[ give me a structured and eye candy reply]]]") to every prompt you send across 50+ AI chat sites (ChatGPT, Gemini, DeepSeek, Qwen, Grok, Claude, Le Chat/Mistral, Copilot, Perplexity, Poe, Doubao, Kimi, Hunyuan, ERNIE, iFlytek Spark, GLM, Meta AI, Genspark, You.com, Duck.ai, HuggingChat, Character.AI, Pi, Venice, Kagi, Brave Leo + local UIs: Open WebUI, Jan, AnythingLLM, SillyTavern, KoboldCpp, llama.cpp WebUI, LM Studio …) PLUS ANY page that looks like a chat UI (generic auto-detect). Shows the tail as a faded ghost inside your composer so you can SEE it working. Intercepts Send-button clicks AND Enter key, survives SPA navigation, handles <textarea>, contenteditable (Slate/ProseMirror/Quill) and shadow DOMs.
// @author       you
// @license      MIT
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// @run-at       document-idle
// ==/UserScript==
// ---------------------------------------------------------------------------
// SCOPE NOTE: this build uses ONE wildcard @match so it runs everywhere, then
// self-checks against KNOWN_SITES (50+ AI hosts) or a generic chat-UI
// detector before activating — brand-new AI sites work out of the box too.
// Want to narrow scope? Replace `*://*/*` above with explicit per-site lines,
// e.g. `// @match https://chatgpt.com/*` (full list in README.md).
// ---------------------------------------------------------------------------

(function () {
  'use strict';

  /* ============================================================
   * CONFIG (editable here, or via ViolentMonkey menu → Config)
   * ============================================================ */
  const DEFAULTS = {
    enabled: true,
    tail: '[[[ give me a structured and eye candy reply]]]', // appended text
    spaceBefore: true, // insert a space between your text and the tail
    oncePerSend: true, // don't append twice if app re-fires events
    ghostPreview: true, // show faded tail inside the composer as you type
    requireChatUI: true, // on unknown sites, only activate if page looks like chat UI
    debug: false,
  };

  let cfg = loadCfg();

  function loadCfg() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(GM_getValue('apt_config', '{}')));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }
  function saveCfg() {
    try { GM_setValue('apt_config', JSON.stringify(cfg)); } catch (e) {}
  }
  function log(...a) { if (cfg.debug) console.log('[PromptTail]', ...a); }

  /* ============================================================
   * ACTIVATION GATE — script runs on every page (wildcard match)
   * but only arms itself on known AI sites or pages that look
   * like a chat UI. This keeps random websites untouched.
   * ============================================================ */
  const KNOWN_HOST_RE = new RegExp(
    [
      // big players
      'chatgpt\\.com', 'chat\\.openai\\.com', 'gemini\\.google\\.com', 'deepseek\\.com',
      'qwen\\.ai', 'qwenlm\\.ai', 'grok\\.com', 'x\\.com', 'claude\\.ai', 'msty\\.ai',
      'mistral\\.ai', 'lechat\\.ai', 'copilot\\.microsoft\\.com', 'bing\\.com', 'perplexity\\.ai',
      'poe\\.com', 'meta\\.ai', 'you\\.com', 'duckduckgo\\.com', 'kagi\\.to', 'brave\\.com',
      'huggingface\\.co', 'character\\.ai', 'pi\\.ai', 'venice\\.ai', 'genspark\\.ai',
      'heyandi\\.com', 'andilabs\\.com', 'lm\\.arena', 'chatbot\\.arena', 'arena\\.ai',
      // chinese platforms
      'doubao\\.com', 'kimi\\.com', 'moonshot\\.cn', 'yiyan\\.baidu\\.com', 'ernie\\.ai',
      'yuanbao\\.tencent\\.com', 'hunyuan\\.tencent\\.com', 'xfyun\\.cn', 'chatglm\\.cn',
      'zhipuai\\.cn', 'bigmodel\\.cn', 'hailuoai\\.com', 'hailuoai\\.video', 'minimax\\.io',
      'stepfun\\.com', 'baichuan-ai\\.com', 'sensetime\\.com', 'sensechat\\.cn',
      'gpt\\.xiaomi\\.net', 'telechat\\.cn', 'skywork\\.ai', 'geechat\\.cn', 'lingyi\\.ai',
      'metaso\\.cn', 'tiangong\\.cn', 'sparkplus\\.cn', 'xingye\\.com', 'aizjk\\.cn',
      // local/open-source UIs (any host, path-matched separately)
    ].join('|')
  );
  const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;
  const LOCAL_UI_PATH_RE = /^\/(c|c\/|chat|chat\/|new|webui|token-gateway|session|script|world|characters?)(\/|$|\?|#)/i;

  function shouldActivate() {
    const host = location.hostname;
    if (KNOWN_HOST_RE.test(host)) return true;
    if (LOCAL_HOST_RE.test(host) && LOCAL_UI_PATH_RE.test(location.pathname)) return true; // Open WebUI / Jan / SillyTavern / KoboldCpp / llama.cpp …
    if (!cfg.requireChatUI) return true; // user opted into "try everywhere"
    return isLikelyChatUI(); // generic detector for unknown AI sites
  }

  // Heuristic: does this page look like an AI chat composer?
  function isLikelyChatUI() {
    try {
      const sels = [
        'div[contenteditable="true"][role="textbox"]',
        'textarea[aria-label*="chat" i]', 'textarea[aria-label*="prompt" i]',
        'textarea[aria-label*="message" i]', 'textarea[placeholder*="message" i]',
        'textarea[placeholder*="prompt" i]', 'textarea[placeholder*="ask" i]',
        '[class*="composer" i]', '[id*="prompt" i]', '[data-testid*="chat-input" i]',
        '[data-testid*="send-button" i]',
      ];
      let score = 0;
      for (const s of sels) if (document.querySelector(s)) score++;
      const hasSend = !!document.querySelector(
        'button[aria-label*="send" i], button[data-testid*="send" i], button[type="submit"] svg, form button'
      );
      return score >= 1 && hasSend;
    } catch (e) { return false; }
  }

  /* ============================================================
   * PER-SITE INPUT SELECTORS (first match wins, then generic).
   * Sites are SPAs — we poll/watch DOM instead of relying on
   * server HTML, which is empty/minified anyway.
   * ============================================================ */
  const SITE_SELECTORS = [
    { host: /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, sel: '#prompt-textarea' },
    { host: /(^|\.)gemini\.google\.com$/, sel: 'rich-textarea .ql-editor, rich-textarea textarea, .ql-editor[contenteditable="true"], textarea[aria-label]' },
    { host: /(^|\.)chat\.deepseek\.com$/, sel: 'textarea#chat-input, [id^="chat-input"], textarea[placeholder]' },
    { host: /(^|\.)chat\.qwen\.ai$|(^|\.)chat\.qwenlm\.ai$|(^|\.)aistudio\.qwen\.ai$/, sel: 'textarea[placeholder], div[contenteditable="true"]' },
    { host: /(^|\.)grok\.com$|(^|\.)x\.com$/, sel: 'textarea[data-testid="composer-input"], [contenteditable="true"][role="textbox"], textarea[placeholder]' },
    { host: /(^|\.)claude\.ai$|(^|\.)msty\.ai$/, sel: 'div[contenteditable="true"][role="textbox"], [data-testid="agent-message-input-field"], .user-message-editing-block [contenteditable="true"], textarea' },
    { host: /(^|\.)chat\.mistral\.ai$|(^|\.)mistral\.ai$|(^|\.)lechat\.ai$/, sel: '[data-testid="chat-input"], textarea[placeholder], div[contenteditable="true"]' },
    { host: /(^|\.)copilot\.microsoft\.com$|(^|\.)bing\.com$/, sel: '#searchbox, textarea[aria-label], div[contenteditable="true"]' },
    { host: /(^|\.)perplexity\.ai$/, sel: 'textarea[aria-label], div[contenteditable="true"], form textarea' },
    { host: /(^|\.)poe\.com$/, sel: 'div[contenteditable="true"][role="textbox"], textarea[aria-label]' },
    { host: /(^|\.)meta\.ai$/, sel: 'div[contenteditable="true"][role="textbox"], textarea[aria-label]' },
    { host: /doubao\.com$/, sel: 'div[contenteditable="true"], textarea[placeholder]' },
    { host: /(^|\.)kimi\.com$|(^|\.)moonshot\.cn$/, sel: 'div[contenteditable="true"][role="textbox"], textarea[placeholder]' },
    { host: /yiyan\.baidu\.com$|(^|\.)ernie\.ai$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /yuanbao\.tencent\.com$|hunyuan\.tencent\.com$/, sel: 'textarea[placeholder], div[contenteditable="true"]' },
    { host: /spark\.xfyun\.cn$|arena\.xfyun\.cn$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /chatglm\.cn$|bigmodel\.cn$|zhipuai\.cn$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /hailuoai\.com$|hailuoai\.video$|minimax\.io$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /stepfun\.com$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /baichuan-ai\.com$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /sensetime\.com$|sensechat\.cn$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /gpt\.xiaomi\.net$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /telechat\.cn$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /skywork\.ai$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /metaso\.cn$|tiangong\.cn$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /genspark\.ai$|heyandi\.com$|andilabs\.com$/, sel: 'textarea, div[contenteditable="true"]' },
    { host: /you\.com$/, sel: 'textarea[aria-label], div[contenteditable="true"]' },
    { host: /duckduckgo\.com$/, sel: 'textarea[aria-label], textarea' },
    { host: /huggingface\.co$/, sel: 'textarea[aria-label], .message-input textarea, textarea' },
    { host: /lm\.arena$|chatbot\.arena$|arena\.ai$/, sel: 'textarea[placeholder], div[contenteditable="true"]' },
    { host: /venice\.ai$|kagi\.to$|brave\.com$|pi\.ai$|character\.ai$/, sel: 'textarea, div[contenteditable="true"]' },
    // local LLM web UIs (matched only when activation gate passed via LOCAL_HOST_RE):
    // Open WebUI #chat-input · SillyTavern/KoboldCpp #send_textarea · Jan prompt-textarea · llama.cpp textarea.prompt
    { host: LOCAL_HOST_RE, sel: '#chat-input, #send_textarea, textarea[data-testid="prompt-textarea"], textarea.prompt, textarea[placeholder], div[contenteditable="true"]' },
    // generic fallback (any other chat UI):
    { host: /.*/, sel: 'div[contenteditable="true"][role="textbox"], textarea[placeholder], textarea[aria-label]' },
  ];

  const SEND_BUTTON_SELECTORS = [
    'button[aria-label="Send Prompt"]',           // ChatGPT
    'button[aria-label*="Send" i]',               // many sites
    'button[data-testid="send-button"]',          // DeepSeek/others
    'button.send-button', 'button[type="submit"]',
    'mat-icon-button.send-button',                // Gemini
    'button[title*="发送"]', 'button[aria-label*="发送"]', // Chinese UIs
  ];

  function currentSelectors() {
    const host = location.hostname;
    for (const s of SITE_SELECTORS) if (s.host.test(host)) return s.sel;
    return 'textarea, div[contenteditable="true"]';
  }

  function findInputs() {
    const out = [];
    const seen = new Set();
    const add = (el) => {
      if (!el || seen.has(el)) return;
      if (!(el instanceof HTMLElement)) return;
      seen.add(el);
      out.push(el);
    };
    // light DOM
    document.querySelectorAll(currentSelectors()).forEach(add);
    // shadow DOM (Gemini's rich-textarea hides a real <textarea> in shadow root)
    document.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) {
        el.shadowRoot.querySelectorAll('textarea, [contenteditable="true"], .ql-editor').forEach(add);
      }
    });
    return out.filter(isEditableInput);
  }

  function isEditableInput(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return !el.disabled && !el.readOnly;
    if (tag === 'input') return el.type === 'text' || el.type === 'search';
    const ce = el.getAttribute('contenteditable');
    return ce === 'true' || ce === '';
  }

  /* ============================================================
   * TEXT GET/SET that works for BOTH textarea & contenteditable
   * and dispatches the events frameworks (React/Slate/ProseMirror)
   * listen to so state stays in sync.
   * ============================================================ */
  function getInputText(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input') return el.value;
    return el.innerText || el.textContent || '';
  }

  function setInputText(el, text) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input') {
      setNativeValue(el, text); // bypass React's value tracker
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      return;
    }
    // contenteditable: prefer execCommand (keeps Slate/ProseMirror models happy)
    try {
      el.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.addRange(range);
      const ok = document.execCommand('insertText', false, text);
      if (ok) return;
    } catch (e) { /* fall through */ }
    // fallback: direct DOM write + event storm
    el.textContent = text;
    ['input', 'beforeinput'].forEach((t) => {
      el.dispatchEvent(new InputEvent(t, { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
    });
  }

  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, String(value));
    else el.value = String(value);
  }

  /* ============================================================
   * CORE: append the tail right before the message is sent
   * Strategy: intercept at CAPTURE phase (keydown Enter / click on
   * send button), mutate the input text, then let the app's own
   * handler run on the mutated text.
   * ============================================================ */
  const MARK = '__apt_pending__';

  function makeTail() {
    return (cfg.spaceBefore ? ' ' : '') + cfg.tail;
  }

  function appendToInput(el) {
    if (!cfg.enabled) return false;
    const cur = getInputText(el).replace(/\u00A0/g, ' ');
    const trimmedEnd = cur.replace(/\s+$/,'');
    if (!trimmedEnd) return false; // nothing typed → don't touch
    if (cfg.oncePerSend && trimmedEnd.endsWith(cfg.tail.trim())) return false; // already appended
    setInputText(el, trimmedEnd + makeTail());
    el.dataset[MARK] = Date.now().toString();
    log('tail appended to', el.tagName, el.id || el.className);
    flashGhost(el);
    return true;
  }

  /* ============================================================
   * GHOST PREVIEW — faded tail rendered inside/behind the
   * composer so you can SEE the script is alive. For textareas
   * we use a transparent overlay positioned after the caret;
   * for contenteditable we insert a real faded <span> that is
   * stripped again before sending (execCommand text ignores it
   * once removed — we remove it right before appendToInput).
   * ============================================================ */
  const GHOST_STYLE_ID = 'apt-ghost-style';
  function injectGhostCSS() {
    if (document.getElementById(GHOST_STYLE_ID)) return;
    const css = `
      .apt-ghost-overlay {
        position: fixed; z-index: 2147483646; pointer-events: none;
        color: rgba(130,130,150,.45); font-style: italic;
        white-space: pre; overflow: hidden; text-shadow: none;
        transition: opacity .25s ease; opacity: 0;
      }
      .apt-ghost-overlay.apt-show { opacity: 1; }
      [contenteditable="true"] .apt-ghost-span {
        color: rgba(130,130,150,.45); font-style: italic; pointer-events: none;
      }
      @keyframes apt-flash { 0% {opacity:1} 70% {opacity:1} 100% {opacity:0} }
      .apt-ghost-overlay.apt-flash { animation: apt-flash 1.1s ease forwards; }
    `;
    const st = document.createElement('style');
    st.id = GHOST_STYLE_ID;
    st.textContent = css;
    document.documentElement.appendChild(st);
  }

  let ghostEl = null;
  function getGhostEl() {
    if (!ghostEl || !ghostEl.isConnected) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'apt-ghost-overlay';
      document.body ? document.body.appendChild(ghostEl) : document.documentElement.appendChild(ghostEl);
    }
    return ghostEl;
  }

  // measure caret pixel position inside a textarea (mirror-div trick)
  function caretCoords(ta) {
    const mirror = document.createElement('div');
    const cs = getComputedStyle(ta);
    const props = ['fontFamily','fontSize','fontWeight','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','whiteSpace','wordWrap','textIndent'];
    props.forEach((p) => (mirror.style[p] = cs[p]));
    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    mirror.style.left = '-9999px';
    mirror.style.width = ta.clientWidth + 'px';
    mirror.style.overflow = 'hidden';
    mirror.textContent = ta.value.slice(0, ta.selectionStart || ta.value.length);
    const marker = document.createElement('span');
    marker.textContent = '\u200b'; // zero-width space marks caret point
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const x = marker.offsetLeft - ta.scrollLeft + parseFloat(cs.borderLeftWidth || 0);
    const y = marker.offsetTop - ta.scrollTop + parseFloat(cs.borderTopWidth || 0);
    document.body.removeChild(mirror);
    const r = ta.getBoundingClientRect();
    return { x: r.left + x, y: r.top + y, font: cs.font, lineHeight: cs.lineHeight };
  }

  function updateGhost() {
    if (!cfg.enabled || !cfg.ghostPreview) { hideGhost(); return; }
    const el = document.activeElement;
    if (!el || !isEditableInput(el)) { hideGhost(); return; }
    const cur = (getInputText(el) || '').replace(/\u200B/g, '');
    const trimmedEnd = cur.replace(/\s+$/, '');
    if (!trimmedEnd || trimmedEnd.endsWith(cfg.tail.trim())) { hideGhost(); return; }
    const g = getGhostEl();
    g.textContent = makeTail();
    const rect = el.getBoundingClientRect();
    if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
      try {
        const c = caretCoords(el);
        g.style.font = c.font;
        g.style.left = c.x + 'px';
        g.style.top = c.y + 'px';
      } catch (e) {
        g.style.font = '';
        g.style.left = rect.left + 12 + 'px';
        g.style.top = rect.bottom - parseFloat(getComputedStyle(el).lineHeight || 20) - 6 + 'px';
      }
    } else {
      g.style.left = rect.left + 14 + 'px';
      g.style.top = rect.bottom - 30 + 'px';
      g.style.font = getComputedStyle(el).font;
    }
    g.classList.add('apt-show');
    g.classList.remove('apt-flash');
  }

  function hideGhost() { if (ghostEl) ghostEl.classList.remove('apt-show', 'apt-flash'); }

  // brief bright flash at send-time as extra "it worked" feedback
  function flashGhost(el) {
    if (!cfg.ghostPreview) return;
    const g = getGhostEl();
    const rect = el.getBoundingClientRect();
    g.textContent = '✓ ' + cfg.tail;
    g.style.left = rect.left + 14 + 'px';
    g.style.top = Math.max(4, rect.top - 26) + 'px';
    g.classList.remove('apt-show');
    void g.offsetWidth; // restart animation
    g.classList.add('apt-flash');
    setTimeout(() => g.classList.remove('apt-flash'), 1200);
  }

  // live-update ghost while typing / moving caret
  ['input', 'keyup', 'click', 'focusin'].forEach((ev) =>
    document.addEventListener(ev, () => requestAnimationFrame(updateGhost), true)
  );
  document.addEventListener('focusout', () => setTimeout(hideGhost, 150), true);
  window.addEventListener('scroll', hideGhost, true);

  function bestInputFor(actionTarget) {
    // find the editable input nearest to where the click/key happened
    let node = actionTarget;
    while (node && node !== document.body) {
      if (isEditableInput(node)) return node;
      const found = node.querySelector && Array.from(node.querySelectorAll('textarea,[contenteditable="true"],.ql-editor')).find(isEditableInput);
      if (found) return found;
      node = node.parentElement || (node.getRootNode && node.getRootNode() !== document ? node.getRootNode().host : null);
    }
    const inputs = findInputs();
    const focused = inputs.find((i) => i === document.activeElement);
    return focused || inputs[0];
  }

  function isSendButton(btn) {
    // SVG/icon elements don't have .closest in all engines — walk parents manually
    let b = null, node = btn;
    while (node && node !== document.body) {
      if (node.tagName && node.tagName.toLowerCase() === 'button') { b = node; break; }
      node = node.parentElement || (node.correspondingElement || null);
      if (node && !node.parentElement && node.getRootNode) {
        const root = node.getRootNode();
        node = root && root.host ? root.host : null;
      }
    }
    if (!b) return false;
    const label = (b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.textContent || '');
    const testId = b.getAttribute('data-testid') || '';
    const cls = typeof b.className === 'string' ? b.className : (b.getAttribute && b.getAttribute('class')) || '';
    return /send|发送|submit/i.test(label) ||
           /send-button|composer-submit|submit-button/i.test(testId + ' ' + cls) ||
           b.type === 'submit';
  }

  // 1) Enter key capture
  document.addEventListener(
    'keydown',
    (e) => {
      if (!cfg.enabled) return;
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const target = e.target;
      if (!isEditableInput(target)) return;
      // only act if this input actually submits on plain Enter
      appendToInput(target);
    },
    true
  );

  // 2) Send button click capture
  document.addEventListener(
    'click',
    (e) => {
      if (!cfg.enabled) return;
      if (!isSendButton(e.target)) return;
      const el = bestInputFor(e.target);
      if (el) appendToInput(el);
    },
    true
  );

  // 3) Safety net: if an app clears the input immediately after send,
  //    restore nothing — but if a framework re-renders the OLD text into
  //    the box and user hits send again quickly, oncePerSend guard covers it.

  /* ============================================================
   * MENU COMMANDS (ViolentMonkey toolbar)
   * ============================================================ */
  function editConfigUI() {
    const t = prompt('Suffix to append to every message:', cfg.tail);
    if (t === null) return;
    cfg.tail = t;
    cfg.spaceBefore = confirm('Add a space before the suffix?');
    cfg.ghostPreview = confirm('Show faded ghost preview of the suffix in the composer?');
    cfg.enabled = confirm('Script enabled?');
    saveCfg();
    location.reload();
  }

  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('⚙️ Configure suffix', editConfigUI);
      GM_registerMenuCommand(cfg.enabled ? '⏸️ Disable' : '▶️ Enable', () => {
        cfg.enabled = !cfg.enabled; saveCfg(); location.reload();
      });
      GM_registerMenuCommand(cfg.ghostPreview ? '👻 Hide ghost preview' : '👻 Show ghost preview', () => {
        cfg.ghostPreview = !cfg.ghostPreview; saveCfg(); location.reload();
      });
      GM_registerMenuCommand('🐞 Toggle debug logging', () => {
        cfg.debug = !cfg.debug; saveCfg(); location.reload();
      });
    }
  } catch (e) {}

  /* ============================================================
   * BOOT — activation gate + MutationObserver for late-appearing
   * composers (SPAs render the input after document-idle).
   * ============================================================ */
  function boot() {
    if (!shouldActivate()) {
      log('not an AI/chat page — standing down on', location.hostname);
      return;
    }
    injectGhostCSS();
    // Re-check periodically: SPA route changes may move us onto a chat view
    setInterval(() => {
      if (!activatedByRoute && shouldActivate()) { activatedByRoute = true; log('chat UI detected late — armed'); }
    }, 3000);
    log('AI Prompt Tail ACTIVE on', location.hostname, '| selectors:', currentSelectors());
    console.log('%c[PromptTail] 👻 active — faded tail will appear in your composer', 'color:#8a8aa0;font-style:italic');
  }

  let activatedByRoute = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
