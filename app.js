(() => {
  const channelInput = document.getElementById('channel-input');
  const connectBtn = document.getElementById('connect-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const chat = document.getElementById('chat');
  const pauseIndicator = document.getElementById('pause-indicator');

  const STORAGE_KEY = 'twitch-chat-monitor-channel';
  const TELEPROMPTER_KEY = 'twitch-chat-monitor-teleprompter';
  const REVERSE_KEY = 'twitch-chat-monitor-reverse';
  const FONT_SIZE_KEY = 'twitch-chat-monitor-font-size';
  const FONT_FAMILY_KEY = 'twitch-chat-monitor-font-family';
  const TIMESTAMPS_KEY = 'twitch-chat-monitor-timestamps';
  const BADGES_KEY = 'twitch-chat-monitor-badges-hidden'; // '1' = hidden, anything else = shown
  const OVERLAY_KEY = 'twitch-chat-monitor-overlay';
  const HIDE_BOTS_KEY = 'twitch-chat-monitor-hide-bots';
  const HIDE_SYSTEM_KEY = 'twitch-chat-monitor-hide-system';
  const HIDE_COMMANDS_KEY = 'twitch-chat-monitor-hide-commands';
  const PRONOUNS_KEY = 'twitch-chat-monitor-pronouns';
  const KEYWORDS_KEY = 'twitch-chat-monitor-keywords';
  const EXCLUDE_USERS_KEY = 'twitch-chat-monitor-exclude-users';
  const LINK_PREVIEWS_KEY = 'twitch-chat-monitor-link-previews';
  const FADE_IDLE_KEY = 'twitch-chat-monitor-fade-idle';
  const FADE_IDLE_SECONDS_KEY = 'twitch-chat-monitor-fade-idle-seconds';
  const AUTO_RECONNECT_KEY = 'twitch-chat-monitor-auto-reconnect';
  const OVERLAY_OPACITY_KEY = 'twitch-chat-monitor-overlay-opacity';
  const MESSAGE_ANIM_KEY = 'twitch-chat-monitor-message-anim';
  const FADE_IDLE_DEFAULT_SECONDS = 30;
  const VALID_ANIMS = new Set(['none', 'fade', 'slide', 'slide-side', 'pop', 'blur', 'glow', 'typewriter', 'decode']);
  // How long (ms) each entry animation runs at the .msg level. After this,
  // we strip the `.anim` class so the entry-animation CSS no longer overrides
  // any perpetual per-message animation (e.g. the power-up gradient shimmer).
  // Typewriter + decode are JS-driven per-character and don't apply any
  // .msg-level animation, so they don't need cleanup (entry: 0).
  const ANIM_CLEANUP_MS = {
    none: 0,
    fade: 280,
    slide: 300,
    'slide-side': 320,
    pop: 360,
    blur: 360,
    glow: 1440,
    typewriter: 0,
    decode: 0,
  };
  // Glyphs cycled through during the Decode animation. Letters + most digits
  // only — explicitly excluding visibly wide chars (M, W, m, w) and narrow
  // ones (I, i, l, 1, 0) plus all symbols, so the scrambled message stays
  // roughly the same visual width as the decoded message. (Earlier versions
  // included @, #, &, %, etc. which made the scramble noticeably wider than
  // the final text and read as "extra characters being added".)
  const DECODE_GLYPHS = 'ABCDEFGHJKLNOPQRSTUVXYZabcdefghjknopqrstuvxyz23456789';

  // Common Twitch chat bots — visible-by-default since some channels rely on
  // these for context, but easy to silence via Settings → Filter.
  const BOT_USERNAMES = new Set([
    'nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot',
    'wizebot', 'soundalerts', 'deepbot', 'ankhbot', 'phantombot',
    'restreambot', 'commanderroot', 'electricallongboard', 'lurxx',
  ]);
  const MAX_MESSAGES = 250;
  const FONT_MIN = 10;
  const FONT_MAX = 64;

  // Curated font stacks. Each value maps a select-option id to a CSS font-family
  // string + weight. All entries fall back to system fonts so nothing is loaded
  // from the network.
  const FONT_FAMILIES = {
    gotham:      { family: "'Gotham Bold', 'Gotham', 'Montserrat', 'Helvetica Neue', Arial, sans-serif", weight: 700 },
    'arial-black': { family: "'Arial Black', 'Helvetica Neue', Arial, sans-serif", weight: 900 },
    impact:      { family: "Impact, 'Haettenschweiler', 'Arial Narrow Bold', sans-serif", weight: 400 },
    verdana:     { family: "Verdana, Geneva, sans-serif", weight: 700 },
    tahoma:      { family: "Tahoma, Geneva, sans-serif", weight: 700 },
    trebuchet:   { family: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif", weight: 700 },
    georgia:     { family: "Georgia, 'Times New Roman', serif", weight: 700 },
    consolas:    { family: "Consolas, 'Courier New', monospace", weight: 700 },
    courier:     { family: "'Courier New', Courier, monospace", weight: 700 },
    system:      { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", weight: 500 },
  };

  let ws = null;
  let currentChannel = null;
  let autoScroll = true;
  let reconnectAttempts = 0;
  let intentionalClose = false;
  let reverseDirection = localStorage.getItem(REVERSE_KEY) === '1';
  let manualPause = false;           // explicit Pause button state
  let userFilter = null;             // lowercased username; null = no filter
  let roomId = null;                 // broadcaster id (from ROOMSTATE) for emote APIs
  const thirdPartyEmotes = new Map();// emote text -> { url, provider }
  const badgeImages = new Map();     // "set/version" -> image URL (Twitch CDN)
  const pronounCache = new Map();    // userLower -> string|null (null = lookup done, no pronoun set)
  const pronounInFlight = new Set(); // userLower currently being fetched
  let pronounsTable = null;          // id -> display string, loaded once from API
  let keywords = [];                 // lowercased keyword strings for highlight matching
  let excludedUsers = new Set();     // lowercased usernames whose messages are hidden

  const filterBanner = document.getElementById('filter-banner');
  const filterUserEl = document.getElementById('filter-user');
  const pauseBtn = document.getElementById('pause-btn');
  const clearBtn = document.getElementById('clear-btn');
  const timestampsBtn = document.getElementById('timestamps-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsMenu = document.getElementById('settings-menu');
  const overlayBtn = document.getElementById('overlay-btn');
  const pronounsBtn = document.getElementById('pronouns-btn');
  const hideBotsBtn = document.getElementById('hide-bots-btn');
  const hideSystemBtn = document.getElementById('hide-system-btn');
  const hideCommandsBtn = document.getElementById('hide-commands-btn');
  const keywordInput = document.getElementById('keyword-input');
  const excludeUsersInput = document.getElementById('exclude-users-input');
  const channelStateEl = document.getElementById('channel-state');
  const linkPreviewsBtn = document.getElementById('link-previews-btn');
  const fadeIdleBtn = document.getElementById('fade-idle-btn');
  const fadeIdleSecondsInput = document.getElementById('fade-idle-seconds');
  const autoReconnectBtn = document.getElementById('auto-reconnect-btn');
  const overlayOpacityInput = document.getElementById('overlay-opacity');

  // Settings popover toggle. Open/close via the gear button; click outside closes.
  function setSettingsOpen(open) {
    settingsMenu.hidden = !open;
    settingsBtn.classList.toggle('active', open);
    settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSettingsOpen(settingsMenu.hidden);
  });
  document.addEventListener('click', (e) => {
    if (settingsMenu.hidden) return;
    if (settingsMenu.contains(e.target) || settingsBtn.contains(e.target)) return;
    setSettingsOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsMenu.hidden) setSettingsOpen(false);
  });

  // Restore last channel
  const savedChannel = localStorage.getItem(STORAGE_KEY);
  if (savedChannel) channelInput.value = savedChannel;

  // Restore teleprompter mode
  const teleprompterBtn = document.getElementById('teleprompter-btn');
  if (localStorage.getItem(TELEPROMPTER_KEY) === '1') {
    document.body.classList.add('teleprompter');
    teleprompterBtn.classList.add('active');
  }
  teleprompterBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('teleprompter');
    teleprompterBtn.classList.toggle('active', on);
    localStorage.setItem(TELEPROMPTER_KEY, on ? '1' : '0');
    if (autoScroll) scrollToNewest();
  });

  // Font size controls (chat only — header stays compact)
  let chatFontSize = parseInt(localStorage.getItem(FONT_SIZE_KEY), 10);
  if (!Number.isFinite(chatFontSize)) chatFontSize = 13;
  function applyFontSize() {
    chatFontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, chatFontSize));
    document.documentElement.style.setProperty('--chat-font-size', chatFontSize + 'px');
    localStorage.setItem(FONT_SIZE_KEY, String(chatFontSize));
    if (autoScroll) scrollToNewest();
  }
  applyFontSize();
  document.getElementById('font-inc').addEventListener('click', () => { chatFontSize += 2; applyFontSize(); });
  document.getElementById('font-dec').addEventListener('click', () => { chatFontSize -= 2; applyFontSize(); });

  // Font family selector
  const fontFamilySelect = document.getElementById('font-family-select');
  function applyFontFamily(key) {
    const spec = FONT_FAMILIES[key] || FONT_FAMILIES.gotham;
    document.documentElement.style.setProperty('--chat-font-family', spec.family);
    document.documentElement.style.setProperty('--chat-font-weight', String(spec.weight));
    localStorage.setItem(FONT_FAMILY_KEY, key);
  }
  const savedFontFamily = localStorage.getItem(FONT_FAMILY_KEY) || 'gotham';
  if (FONT_FAMILIES[savedFontFamily]) {
    fontFamilySelect.value = savedFontFamily;
    applyFontFamily(savedFontFamily);
  }
  fontFamilySelect.addEventListener('change', () => applyFontFamily(fontFamilySelect.value));

  // Restore + wire up invert toggle. The body class lets CSS pick the right
  // slide-in direction (newest edge = top when inverted, bottom otherwise).
  const invertBtn = document.getElementById('invert-btn');
  document.body.classList.toggle('invert-mode', reverseDirection);
  if (reverseDirection) invertBtn.classList.add('active');
  invertBtn.addEventListener('click', () => {
    reverseDirection = !reverseDirection;
    localStorage.setItem(REVERSE_KEY, reverseDirection ? '1' : '0');
    invertBtn.classList.toggle('active', reverseDirection);
    document.body.classList.toggle('invert-mode', reverseDirection);
    // Reverse existing DOM children so chat history stays in chronological order
    // relative to the new direction (newest visually adjacent to the newest edge).
    const children = Array.from(chat.children);
    for (const c of children) chat.removeChild(c);
    for (const c of children.reverse()) chat.appendChild(c);
    autoScroll = true;
    scrollToNewest();
    pauseIndicator.classList.remove('visible');
  });

  function setStatus(state, text) {
    statusEl.className = state;
    statusText.textContent = text;
  }

  function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.textContent = text;
    appendMessage(div);
  }

  function appendMessage(node) {
    // If chat is mid-fade or already faded, wipe the stale (invisible) messages
    // first so the viewer only ever sees fresh activity after a silence.
    if (fadeIdleEnabled && chat.classList.contains('fading-out')) {
      chat.classList.remove('fading-out');
      chat.innerHTML = '';
    }
    // Apply active user filter at insertion time so the DOM stays consistent.
    if (userFilter) {
      const u = node.dataset && node.dataset.user;
      if (!u || u !== userFilter) node.classList.add('filter-hidden');
    }
    // Permanent per-user exclusion list (Settings → Filter → Exclude users).
    if (excludedUsers.size > 0) {
      const u = node.dataset && node.dataset.user;
      if (u && excludedUsers.has(u)) node.classList.add('user-excluded');
    }
    // Tag for entry animation. Typewriter + decode need DOM prep before
    // insertion (typewriter wraps chars with delayed CSS reveal; decode wraps
    // chars and schedules a scramble interval). Container animations just rely
    // on the .anim class + body[data-anim] CSS rule.
    //
    // For modes that animate the .msg itself we strip the .anim class once
    // the animation has finished so per-message perpetual animations (e.g.
    // the power-up gradient shimmer) can resume — the entry-animation rule
    // would otherwise win on specificity forever.
    if (messageAnim !== 'none') {
      node.classList.add('anim');
      if (messageAnim === 'typewriter') {
        applyTypewriterPrep(node);
      } else if (messageAnim === 'decode') {
        applyDecodePrep(node);
      } else {
        const dur = ANIM_CLEANUP_MS[messageAnim] || 0;
        if (dur > 0) setTimeout(() => node.classList.remove('anim'), dur);
      }
    }
    if (reverseDirection) {
      chat.insertBefore(node, chat.firstChild);
      while (chat.children.length > MAX_MESSAGES) {
        chat.removeChild(chat.lastChild);
      }
    } else {
      chat.appendChild(node);
      while (chat.children.length > MAX_MESSAGES) {
        chat.removeChild(chat.firstChild);
      }
    }
    if (autoScroll) scrollToNewest();
    scheduleFadeOut();
  }

  function formatTime(date) {
    const d = date || new Date();
    return d.getHours().toString().padStart(2, '0') + ':' +
           d.getMinutes().toString().padStart(2, '0');
  }

  function applyFilterToExisting() {
    for (const m of chat.children) {
      if (!userFilter) {
        m.classList.remove('filter-hidden');
      } else {
        const u = m.dataset && m.dataset.user;
        m.classList.toggle('filter-hidden', !u || u !== userFilter);
      }
    }
  }

  function setUserFilter(name) {
    userFilter = name ? name.toLowerCase() : null;
    if (userFilter) {
      filterUserEl.textContent = userFilter;
      filterBanner.hidden = false;
    } else {
      filterBanner.hidden = true;
    }
    applyFilterToExisting();
    if (autoScroll) scrollToNewest();
  }

  function scrollToNewest() {
    chat.scrollTop = reverseDirection ? 0 : chat.scrollHeight;
  }

  // Pause auto-scroll when user scrolls away from the "newest" edge.
  function checkAtNewest() {
    if (reverseDirection) return chat.scrollTop < 30;
    return chat.scrollHeight - chat.scrollTop - chat.clientHeight < 30;
  }

  // Pause auto-scroll based purely on scroll position. Works on both mouse wheel
  // and touch scrolling without depending on hover events (which don't fire on
  // mobile / tablet). Manual pause overrides this.
  chat.addEventListener('scroll', () => {
    if (manualPause) return;
    if (checkAtNewest()) {
      autoScroll = true;
      pauseIndicator.classList.remove('visible');
    } else {
      autoScroll = false;
      pauseIndicator.classList.add('visible');
    }
  });
  pauseIndicator.addEventListener('click', () => {
    if (manualPause) return; // user must release manual pause explicitly
    autoScroll = true;
    scrollToNewest();
    pauseIndicator.classList.remove('visible');
  });

  // Manual pause button
  pauseBtn.addEventListener('click', () => {
    manualPause = !manualPause;
    pauseBtn.classList.toggle('active', manualPause);
    pauseBtn.textContent = manualPause ? 'Resume' : 'Pause';
    if (manualPause) {
      autoScroll = false;
      pauseIndicator.classList.add('visible');
    } else {
      autoScroll = true;
      scrollToNewest();
      pauseIndicator.classList.remove('visible');
    }
  });

  // Clear chat button
  clearBtn.addEventListener('click', () => {
    chat.innerHTML = '';
    resetFadeState();
  });

  // Timestamps toggle
  if (localStorage.getItem(TIMESTAMPS_KEY) === '1') {
    document.body.classList.add('show-timestamps');
    timestampsBtn.classList.add('active');
  }
  timestampsBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('show-timestamps');
    timestampsBtn.classList.toggle('active', on);
    localStorage.setItem(TIMESTAMPS_KEY, on ? '1' : '0');
  });

  // Badges toggle — default is shown. When hidden we also skip the badge CDN
  // fetch to keep network activity minimal.
  const badgesBtn = document.getElementById('badges-btn');
  const badgesHiddenInit = localStorage.getItem(BADGES_KEY) === '1';
  if (badgesHiddenInit) {
    document.body.classList.add('hide-badges');
  } else {
    badgesBtn.classList.add('active');
  }
  badgesBtn.addEventListener('click', () => {
    const nowHidden = document.body.classList.toggle('hide-badges');
    badgesBtn.classList.toggle('active', !nowHidden);
    localStorage.setItem(BADGES_KEY, nowHidden ? '1' : '0');
    // If the user just enabled badges and we have a room id but no badges
    // loaded, fetch them now.
    if (!nowHidden && roomId && badgeImages.size === 0) {
      loadBadges(roomId);
    }
  });

  // Overlay mode (for OBS browser source).
  // Toggle the class on BOTH <html> and <body> — OBS composites against the
  // html element so leaving its background opaque shows up as a dark rectangle
  // even when body is transparent.
  function setOverlayMode(on) {
    document.documentElement.classList.toggle('overlay-mode', on);
    document.body.classList.toggle('overlay-mode', on);
    overlayBtn.classList.toggle('active', on);
  }
  if (localStorage.getItem(OVERLAY_KEY) === '1') {
    setOverlayMode(true);
  }
  overlayBtn.addEventListener('click', () => {
    const on = !document.body.classList.contains('overlay-mode');
    setOverlayMode(on);
    localStorage.setItem(OVERLAY_KEY, on ? '1' : '0');
  });

  // Overlay background opacity (0-100, default 0 = fully transparent). Drives
  // a CSS custom property that the overlay-mode chat background reads. Only
  // takes visible effect when overlay mode is on, but the value persists either way.
  let overlayOpacity = parseInt(localStorage.getItem(OVERLAY_OPACITY_KEY), 10);
  if (!Number.isFinite(overlayOpacity) || overlayOpacity < 0 || overlayOpacity > 100) {
    overlayOpacity = 0;
  }
  overlayOpacityInput.value = String(overlayOpacity);
  document.documentElement.style.setProperty('--overlay-bg-opacity', String(overlayOpacity / 100));
  overlayOpacityInput.addEventListener('input', () => {
    const v = parseInt(overlayOpacityInput.value, 10);
    if (!Number.isFinite(v)) return;
    overlayOpacity = Math.max(0, Math.min(100, v));
    document.documentElement.style.setProperty('--overlay-bg-opacity', String(overlayOpacity / 100));
    localStorage.setItem(OVERLAY_OPACITY_KEY, String(overlayOpacity));
  });

  // Hide bots toggle
  if (localStorage.getItem(HIDE_BOTS_KEY) === '1') {
    document.body.classList.add('hide-bots');
    hideBotsBtn.classList.add('active');
  }
  hideBotsBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('hide-bots');
    hideBotsBtn.classList.toggle('active', on);
    localStorage.setItem(HIDE_BOTS_KEY, on ? '1' : '0');
  });

  // Hide system messages toggle
  if (localStorage.getItem(HIDE_SYSTEM_KEY) === '1') {
    document.body.classList.add('hide-system');
    hideSystemBtn.classList.add('active');
  }
  hideSystemBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('hide-system');
    hideSystemBtn.classList.toggle('active', on);
    localStorage.setItem(HIDE_SYSTEM_KEY, on ? '1' : '0');
  });

  // Hide commands toggle — silences any message whose first non-space char is
  // "!" (the conventional Twitch bot-command prefix). Each message is tagged
  // with .command-msg at render time, so toggling the body class shows/hides
  // them with no re-render.
  if (localStorage.getItem(HIDE_COMMANDS_KEY) === '1') {
    document.body.classList.add('hide-commands');
    hideCommandsBtn.classList.add('active');
  }
  hideCommandsBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('hide-commands');
    hideCommandsBtn.classList.toggle('active', on);
    localStorage.setItem(HIDE_COMMANDS_KEY, on ? '1' : '0');
  });

  // Pronouns toggle — off by default to keep the app connection-free out of the box.
  let pronounsEnabled = localStorage.getItem(PRONOUNS_KEY) === '1';
  if (pronounsEnabled) {
    pronounsBtn.classList.add('active');
    loadPronounsTable();
  }
  pronounsBtn.addEventListener('click', () => {
    pronounsEnabled = !pronounsEnabled;
    pronounsBtn.classList.toggle('active', pronounsEnabled);
    localStorage.setItem(PRONOUNS_KEY, pronounsEnabled ? '1' : '0');
    if (pronounsEnabled) loadPronounsTable();
  });

  // Link previews — on by default since they're a major QoL upgrade, but easy
  // to disable when running connection-free.
  let linkPreviewsEnabled = localStorage.getItem(LINK_PREVIEWS_KEY) !== '0';
  if (linkPreviewsEnabled) linkPreviewsBtn.classList.add('active');
  linkPreviewsBtn.addEventListener('click', () => {
    linkPreviewsEnabled = !linkPreviewsEnabled;
    linkPreviewsBtn.classList.toggle('active', linkPreviewsEnabled);
    localStorage.setItem(LINK_PREVIEWS_KEY, linkPreviewsEnabled ? '1' : '0');
  });

  // Auto-reconnect: on page load, reconnect to the last channel automatically.
  // On by default since it matches user expectation; a URL hash deep-link
  // always takes precedence over the saved channel.
  let autoReconnectEnabled = localStorage.getItem(AUTO_RECONNECT_KEY) !== '0';
  if (autoReconnectEnabled) autoReconnectBtn.classList.add('active');
  autoReconnectBtn.addEventListener('click', () => {
    autoReconnectEnabled = !autoReconnectEnabled;
    autoReconnectBtn.classList.toggle('active', autoReconnectEnabled);
    localStorage.setItem(AUTO_RECONNECT_KEY, autoReconnectEnabled ? '1' : '0');
  });

  // Fade-idle: after N seconds of silence, fade the chat to opacity 0. When
  // the next message arrives, clear the (now invisible) old messages so only
  // fresh activity is visible. Off by default; configurable timeout.
  let fadeIdleEnabled = localStorage.getItem(FADE_IDLE_KEY) === '1';
  let fadeIdleSeconds = parseInt(localStorage.getItem(FADE_IDLE_SECONDS_KEY), 10);
  if (!Number.isFinite(fadeIdleSeconds) || fadeIdleSeconds < 5) {
    fadeIdleSeconds = FADE_IDLE_DEFAULT_SECONDS;
  }
  fadeIdleSecondsInput.value = String(fadeIdleSeconds);
  if (fadeIdleEnabled) fadeIdleBtn.classList.add('active');
  let fadeIdleTimer = null;

  fadeIdleBtn.addEventListener('click', () => {
    fadeIdleEnabled = !fadeIdleEnabled;
    fadeIdleBtn.classList.toggle('active', fadeIdleEnabled);
    localStorage.setItem(FADE_IDLE_KEY, fadeIdleEnabled ? '1' : '0');
    if (fadeIdleEnabled) {
      scheduleFadeOut();
    } else {
      resetFadeState();
    }
  });

  fadeIdleSecondsInput.addEventListener('change', () => {
    let n = parseInt(fadeIdleSecondsInput.value, 10);
    if (!Number.isFinite(n)) n = FADE_IDLE_DEFAULT_SECONDS;
    n = Math.max(5, Math.min(600, n));
    fadeIdleSeconds = n;
    fadeIdleSecondsInput.value = String(n);
    localStorage.setItem(FADE_IDLE_SECONDS_KEY, String(n));
    if (fadeIdleEnabled) scheduleFadeOut(); // restart timer with new duration
  });

  function scheduleFadeOut() {
    clearTimeout(fadeIdleTimer);
    if (!fadeIdleEnabled) return;
    fadeIdleTimer = setTimeout(() => {
      chat.classList.add('fading-out');
    }, fadeIdleSeconds * 1000);
  }

  function resetFadeState() {
    clearTimeout(fadeIdleTimer);
    fadeIdleTimer = null;
    chat.classList.remove('fading-out');
  }

  // Message entry animation selector. Stored as one of VALID_ANIMS; default
  // 'fade' (subtle but noticeably alive). The selected mode is reflected on
  // <body data-anim="..."> so the keyframes in CSS pick up automatically.
  const messageAnimSelect = document.getElementById('message-anim-select');
  // Default to 'none' so updates don't silently opt existing users into
  // motion — they pick an animation explicitly from Settings if they want it.
  let messageAnim = localStorage.getItem(MESSAGE_ANIM_KEY) || 'none';
  // Re-validate against the (possibly updated) set on every load so values
  // saved by older builds with names we no longer recognise reset cleanly.
  if (!VALID_ANIMS.has(messageAnim)) messageAnim = 'none';
  document.body.dataset.anim = messageAnim;
  messageAnimSelect.value = messageAnim;
  messageAnimSelect.addEventListener('change', () => {
    const v = messageAnimSelect.value;
    if (!VALID_ANIMS.has(v)) return;
    messageAnim = v;
    document.body.dataset.anim = v;
    localStorage.setItem(MESSAGE_ANIM_KEY, v);
  });

  // Typewriter prep: walk .text descendants and wrap each character of every
  // text node — plus each inline element (emote, link) — in a .tw-step span
  // with a sequential --tw-d delay. We cap the per-char delay so a very long
  // message still finishes in a reasonable time.
  function applyTypewriterPrep(node) {
    const textEl = node.querySelector('.text');
    if (!textEl) return;
    const steps = [];
    // First, split text-node children into per-char spans; element children
    // (img.emote, a.msg-link) become single steps. Walk a static snapshot
    // since we mutate the tree as we go.
    const children = Array.from(textEl.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          if (ch === ' ' || ch === '\n' || ch === '\t') {
            // Whitespace stays unwrapped so layout breaks naturally.
            frag.appendChild(document.createTextNode(ch));
            continue;
          }
          const span = document.createElement('span');
          span.className = 'tw-step';
          span.textContent = ch;
          frag.appendChild(span);
          steps.push(span);
        }
        textEl.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const wrap = document.createElement('span');
        wrap.className = 'tw-step';
        textEl.replaceChild(wrap, child);
        wrap.appendChild(child);
        steps.push(wrap);
      }
    }
    // Target ~750ms total reveal, capped at 30ms/char so 5-char messages
    // still feel deliberate and 200-char messages don't drag past ~6s.
    const perChar = Math.min(30, Math.max(10, Math.round(750 / Math.max(1, steps.length))));
    for (let i = 0; i < steps.length; i++) {
      steps[i].style.setProperty('--tw-d', (i * perChar) + 'ms');
    }
  }

  // Decode prep: similar wrap to typewriter, but each char starts as a random
  // glyph and cycles through more random glyphs for a brief scramble window
  // before locking in to its real value. Inline elements (emotes, links) are
  // wrapped in a single .dc-step that simply hides-then-unhides at its slot.
  // Honors prefers-reduced-motion by bailing out entirely (the message just
  // renders normally — no scramble at all).
  function applyDecodePrep(node) {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const textEl = node.querySelector('.text');
    if (!textEl) return;
    const targets = [];
    const children = Array.from(textEl.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          if (ch === ' ' || ch === '\n' || ch === '\t') {
            frag.appendChild(document.createTextNode(ch));
            continue;
          }
          const span = document.createElement('span');
          span.className = 'dc-step';
          span.textContent = randomDecodeGlyph();
          frag.appendChild(span);
          targets.push({ span, real: ch });
        }
        textEl.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const wrap = document.createElement('span');
        wrap.className = 'dc-step';
        // Inline elements (emotes, links) can't show a "random glyph", so we
        // just hold their slot invisible and reveal at the right delay.
        wrap.style.visibility = 'hidden';
        textEl.replaceChild(wrap, child);
        wrap.appendChild(child);
        targets.push({ span: wrap, real: null });
      }
    }
    // Target ~625ms total stagger, with each char scrambling for ~300ms
    // before locking. Long messages still finish quickly because the stagger
    // overlaps with the scramble — last char starts late but scrambles fast.
    const perChar = Math.min(28, Math.max(8, Math.round(625 / Math.max(1, targets.length))));
    const scrambleMs = 300;
    targets.forEach((t, i) => {
      const startDelay = i * perChar;
      setTimeout(() => {
        if (t.real === null) {
          // Inline element slot: just unhide and mark done so the styling
          // override clears (the wrapper had no scramble text to begin with).
          t.span.style.visibility = '';
          t.span.classList.add('dc-done');
          return;
        }
        const iv = setInterval(() => {
          t.span.textContent = randomDecodeGlyph();
        }, 40);
        setTimeout(() => {
          clearInterval(iv);
          t.span.textContent = t.real;
          t.span.classList.add('dc-done');
        }, scrambleMs);
      }, startDelay);
    });
  }

  function randomDecodeGlyph() {
    return DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)];
  }

  // Keyword highlight input — comma-separated; persists immediately
  keywords = parseKeywords(localStorage.getItem(KEYWORDS_KEY) || '');
  keywordInput.value = localStorage.getItem(KEYWORDS_KEY) || '';
  keywordInput.addEventListener('input', () => {
    const raw = keywordInput.value;
    keywords = parseKeywords(raw);
    localStorage.setItem(KEYWORDS_KEY, raw);
  });

  function parseKeywords(raw) {
    return raw
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);
  }

  // Per-user exclusion: validates against Twitch's username charset so a typo
  // (e.g. trailing comma, space, punctuation) can't silently swallow a real
  // username elsewhere in the list.
  function parseExcludedUsers(raw) {
    const set = new Set();
    for (const s of raw.split(',')) {
      const u = s.trim().toLowerCase();
      if (/^[a-z0-9_]{1,25}$/.test(u)) set.add(u);
    }
    return set;
  }

  excludedUsers = parseExcludedUsers(localStorage.getItem(EXCLUDE_USERS_KEY) || '');
  excludeUsersInput.value = localStorage.getItem(EXCLUDE_USERS_KEY) || '';
  excludeUsersInput.addEventListener('input', () => {
    const raw = excludeUsersInput.value;
    excludedUsers = parseExcludedUsers(raw);
    localStorage.setItem(EXCLUDE_USERS_KEY, raw);
    // Retro-apply to existing messages so toggling a user on/off is instant.
    for (const m of chat.children) {
      const u = m.dataset && m.dataset.user;
      m.classList.toggle('user-excluded', !!u && excludedUsers.has(u));
    }
    if (autoScroll) scrollToNewest();
  });

  // Click a username to filter to that user; clear filter via banner button.
  chat.addEventListener('click', (e) => {
    const nameEl = e.target.closest('.name');
    if (!nameEl) return;
    const msgEl = nameEl.closest('.msg');
    if (!msgEl || !msgEl.dataset.user) return;
    setUserFilter(msgEl.dataset.user);
  });
  document.getElementById('filter-clear').addEventListener('click', () => setUserFilter(null));

  // ---- IRC tag parsing ----
  function parseTags(tagString) {
    const tags = {};
    if (!tagString) return tags;
    for (const part of tagString.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) {
        tags[part] = '';
      } else {
        const k = part.slice(0, eq);
        let v = part.slice(eq + 1);
        // Unescape IRCv3 tag values
        v = v.replace(/\\:/g, ';').replace(/\\s/g, ' ').replace(/\\\\/g, '\\').replace(/\\r/g, '\r').replace(/\\n/g, '\n');
        tags[k] = v;
      }
    }
    return tags;
  }

  function parseMessage(line) {
    let tags = {};
    let prefix = null;
    let rest = line;

    if (rest.startsWith('@')) {
      const sp = rest.indexOf(' ');
      tags = parseTags(rest.slice(1, sp));
      rest = rest.slice(sp + 1);
    }
    if (rest.startsWith(':')) {
      const sp = rest.indexOf(' ');
      prefix = rest.slice(1, sp);
      rest = rest.slice(sp + 1);
    }

    const trailingIdx = rest.indexOf(' :');
    let params, trailing = null;
    if (trailingIdx !== -1) {
      params = rest.slice(0, trailingIdx).split(' ');
      trailing = rest.slice(trailingIdx + 2);
    } else {
      params = rest.split(' ');
    }
    const command = params.shift();
    if (trailing !== null) params.push(trailing);

    return { tags, prefix, command, params };
  }

  // ---- Badge rendering ----
  // Use text badges (no API call needed). Map known badge IDs to CSS classes / short labels.
  const BADGE_LABELS = {
    broadcaster: 'HOST',
    moderator: 'MOD',
    vip: 'VIP',
    subscriber: 'SUB',
    founder: 'FNDR',
    premium: 'PRIME',
    turbo: 'TURBO',
    partner: '✓',
    staff: 'STAFF',
    admin: 'ADMIN',
    global_mod: 'GMOD',
    bits: 'BITS',
    'no_audio': '🔇',
    'no_video': '📷',
  };

  function renderBadges(badgesTag) {
    if (!badgesTag) return '';
    const out = [];
    for (const b of badgesTag.split(',')) {
      const [id, version] = b.split('/');
      const label = BADGE_LABELS[id] || id;
      // Prefer the real Twitch badge image when we have one. Otherwise fall
      // back to the colored text-badge styling.
      const iconUrl = badgeImages.get(`${id}/${version}`);
      if (iconUrl && isSafeEmoteUrl(iconUrl)) {
        out.push(
          `<span class="badge badge-img" title="${escapeHtml(label)}">` +
          `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(label)}" /></span>`
        );
      } else {
        const cls = BADGE_LABELS[id] ? id : 'default';
        const text = BADGE_LABELS[id] || id.slice(0, 3).toUpperCase();
        out.push(`<span class="badge ${cls}" title="${escapeHtml(label)}">${escapeHtml(text)}</span>`);
      }
    }
    return out.join('');
  }

  // ---- Emote rendering ----
  // Twitch's "emotes" tag uses character positions on the visible message:
  //   "id:start-end,start-end/id:start-end"
  // Third-party emotes (BTTV / FFZ / 7TV) match by exact whitespace-delimited
  // token. We splice Twitch emotes in first (by position), then run third-party
  // matching against the remaining text segments.
  function renderMessageWithEmotes(text, emotesTag) {
    const chars = Array.from(text);
    const hasTpe = thirdPartyEmotes.size > 0;
    if (!emotesTag && !hasTpe) return escapeHtml(chars.join(''));

    const replacements = [];
    if (emotesTag) {
      for (const emote of emotesTag.split('/')) {
        const [id, ranges] = emote.split(':');
        if (!ranges) continue;
        if (!/^[A-Za-z0-9_]+$/.test(id)) continue;
        for (const range of ranges.split(',')) {
          const [start, end] = range.split('-').map(Number);
          if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
          replacements.push({ start, end, id });
        }
      }
      replacements.sort((a, b) => a.start - b.start);
    }

    let html = '';
    let i = 0;
    for (const r of replacements) {
      if (r.start > i) {
        html += renderTextSegment(chars.slice(i, r.start).join(''));
      }
      const emoteText = chars.slice(r.start, r.end + 1).join('');
      const url = `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/1.0`;
      html += `<img class="emote" src="${url}" alt="${escapeHtml(emoteText)}" title="${escapeHtml(emoteText)}" />`;
      i = r.end + 1;
    }
    if (i < chars.length) {
      html += renderTextSegment(chars.slice(i).join(''));
    }
    return html;
  }

  function renderTextSegment(text) {
    if (thirdPartyEmotes.size === 0 && !text.includes('http')) {
      return escapeHtml(text);
    }
    // Split on whitespace but preserve it so spacing stays intact.
    const parts = text.split(/(\s+)/);
    let out = '';
    let pendingWs = '';   // whitespace held back; emitted only when followed by content
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { pendingWs += part; continue; }
      const tpe = thirdPartyEmotes.get(part);
      if (tpe && isSafeEmoteUrl(tpe.url)) {
        out += escapeHtml(pendingWs);
        pendingWs = '';
        out += `<img class="emote tpe" src="${escapeHtml(tpe.url)}" alt="${escapeHtml(part)}" title="${escapeHtml(part)} (${tpe.provider})" />`;
      } else if (looksLikeUrl(part)) {
        if (urlWillPreview(part)) {
          // URL will render as a media/pill card below; drop the visible link
          // AND the whitespace that led up to it so we don't leave double-spaces.
          pendingWs = '';
        } else {
          out += escapeHtml(pendingWs);
          pendingWs = '';
          const safe = escapeHtml(part);
          out += `<a class="msg-link" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
        }
      } else {
        out += escapeHtml(pendingWs);
        pendingWs = '';
        out += escapeHtml(part);
      }
    }
    // Trailing whitespace only matters when followed by content; safe to drop.
    return out;
  }

  function looksLikeUrl(s) {
    return s.length < 2048 && /^https?:\/\/[^\s<>"'`]+$/i.test(s);
  }

  function extractUrls(text) {
    if (!text || !text.includes('http')) return [];
    const out = [];
    for (const part of text.split(/\s+/)) {
      if (looksLikeUrl(part)) out.push(part);
    }
    return out;
  }

  // ---- Link previews ----
  // Pure client-side: only kinds we can render without a backend.
  //   - direct image URLs (jpg/png/gif/webp/bmp) → inline thumbnail
  //   - YouTube videos → thumbnail from img.youtube.com (no API needed)
  //   - Twitch clips → styled pill (Twitch CDN paths are not stable enough to
  //                    embed thumbnails without the Helix API)
  function attachLinkPreviews(msgDiv, text) {
    if (!linkPreviewsEnabled) return;
    const urls = extractUrls(text);
    if (urls.length === 0) return;
    let attached = 0;
    for (const url of urls) {
      if (attached >= 2) break; // keep noise down on link-heavy messages
      const card = buildPreviewCard(url);
      if (card) {
        msgDiv.appendChild(card);
        attached++;
      }
    }
  }

  // Classify a URL into a preview type. Returns null for generic article-style
  // URLs (which stay linkified in the message text). Centralised so the text
  // renderer can ask "will this URL become a preview?" using the same logic.
  function classifyUrl(url) {
    if (/\.(jpe?g|png|gif|webp|bmp|avif)(\?[^"\s]*)?$/i.test(url)) return 'image';
    if (/\.(mp4|webm)(\?[^"\s]*)?$/i.test(url)) return 'video';
    if (extractGiphyId(url)) return 'giphy';
    if (extractYouTubeId(url)) return 'youtube';
    if (/^https?:\/\/clips\.twitch\.tv\/[A-Za-z0-9_-]+/i.test(url)) return 'twitch-clip';
    if (/^https?:\/\/(?:www\.)?twitch\.tv\/\w+\/clip\/[A-Za-z0-9_-]+/i.test(url)) return 'twitch-clip';
    if (/^https?:\/\/(?:www\.)?twitch\.tv\/videos\/[0-9]+/i.test(url)) return 'twitch-vod';
    return null;
  }

  // Used by renderTextSegment: if true, the URL is dropped from the message
  // text because a preview card will render below it.
  function urlWillPreview(url) {
    return linkPreviewsEnabled && classifyUrl(url) !== null;
  }

  function extractYouTubeId(url) {
    const m = url.match(/^https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?[\w=&-]*v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,15})/i);
    return m ? m[1] : null;
  }

  function buildPreviewCard(url) {
    const type = classifyUrl(url);
    switch (type) {
      case 'image':       return imagePreview(url);
      case 'video':       return videoPreview(url);
      case 'giphy':       return giphyPreview(extractGiphyId(url), url);
      case 'youtube':     return youtubePreview(extractYouTubeId(url), url);
      case 'twitch-clip': return twitchClipPreview(url);
      case 'twitch-vod':  return twitchPillPreview(url, '▶ Twitch VOD');
      default:            return null;
    }
  }

  function extractTwitchClipSlug(url) {
    let m = url.match(/^https?:\/\/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/i);
    if (m) return m[1];
    m = url.match(/^https?:\/\/(?:www\.)?twitch\.tv\/\w+\/clip\/([A-Za-z0-9_-]+)/i);
    return m ? m[1] : null;
  }

  // Twitch's public GraphQL endpoint accepts read-only queries for public data
  // when sent with the well-known web client ID. No OAuth needed. We use this
  // to fetch a clip's thumbnail URL and title, then render a YouTube-style
  // card. If the GQL call fails (CORS, rate limit, endpoint change, etc.) the
  // placeholder pill stays as a clickable fallback.
  const TWITCH_GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

  function twitchClipPreview(url) {
    const slug = extractTwitchClipSlug(url);
    if (!slug || !/^[A-Za-z0-9_-]+$/.test(slug)) return null;

    // Immediate pill placeholder — upgrades to a thumbnail card on GQL success.
    const card = twitchPillPreview(url, '🎬 Twitch Clip (loading…)');

    fetchTwitchClipMeta(slug).then(clip => {
      if (!clip || !clip.thumbnailURL) {
        revertTwitchClipPill(card, url);
        return;
      }
      upgradeTwitchClipCard(card, url, clip);
    }).catch(() => revertTwitchClipPill(card, url));

    return card;
  }

  async function fetchTwitchClipMeta(slug) {
    try {
      const r = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': TWITCH_GQL_CLIENT_ID,
        },
        body: JSON.stringify({
          operationName: 'ClipsPreview',
          query: 'query ClipsPreview($slug: ID!) { clip(slug: $slug) { thumbnailURL(width: 480, height: 272) title broadcaster { displayName } durationSeconds } }',
          variables: { slug },
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      return (data && data.data && data.data.clip) || null;
    } catch (_) {
      return null;
    }
  }

  function upgradeTwitchClipCard(card, originalUrl, clip) {
    if (!isSafeEmoteUrl(clip.thumbnailURL)) {
      revertTwitchClipPill(card, originalUrl);
      return;
    }
    card.className = 'preview-card preview-twitch-clip';
    card.innerHTML = '';
    const a = document.createElement('a');
    a.href = originalUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = clip.title || 'Twitch Clip';
    const img = document.createElement('img');
    img.src = clip.thumbnailURL;
    img.loading = 'lazy';
    img.alt = clip.title || 'Twitch Clip';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => revertTwitchClipPill(card, originalUrl));
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    const broadcaster = clip.broadcaster && clip.broadcaster.displayName;
    overlay.innerHTML =
      '<span class="preview-icon">▶</span>' +
      `<span class="preview-label">${escapeHtml(broadcaster ? `${broadcaster} · Twitch Clip` : 'Twitch Clip')}</span>`;
    a.appendChild(img);
    a.appendChild(overlay);
    card.appendChild(a);
  }

  function revertTwitchClipPill(card, originalUrl) {
    card.className = 'preview-card preview-pill';
    card.innerHTML = '';
    const a = document.createElement('a');
    a.href = originalUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = '🎬 Twitch Clip';
    card.appendChild(a);
  }

  function extractGiphyId(url) {
    // Match Giphy page URLs: giphy.com/gifs/<slug-with-id>  or  /stickers/<slug-with-id>
    // The trailing alphanumeric segment of the slug is the same ID used on the CDN.
    const m = url.match(/^https?:\/\/(?:www\.)?giphy\.com\/(?:gifs|stickers)\/([^/?#]+)/i);
    if (!m) return null;
    const idMatch = m[1].match(/([A-Za-z0-9]{8,30})$/);
    return idMatch ? idMatch[1] : null;
  }

  function giphyPreview(id, originalUrl) {
    const card = document.createElement('div');
    card.className = 'preview-card preview-giphy';
    const a = document.createElement('a');
    a.href = originalUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.src = `https://media.giphy.com/media/${id}/giphy.gif`;
    img.loading = 'lazy';
    img.alt = 'Giphy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => card.remove());
    a.appendChild(img);
    card.appendChild(a);
    return card;
  }

  function videoPreview(url) {
    const card = document.createElement('div');
    card.className = 'preview-card preview-video';
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.addEventListener('error', () => card.remove());
    card.appendChild(video);
    // Whole card is clickable since the <video> element captures clicks itself.
    card.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
    return card;
  }


  function imagePreview(url) {
    const card = document.createElement('div');
    card.className = 'preview-card preview-image';
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    img.alt = 'Linked image';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => card.remove());
    a.appendChild(img);
    card.appendChild(a);
    return card;
  }

  function youtubePreview(videoId, url) {
    if (!/^[A-Za-z0-9_-]{6,15}$/.test(videoId)) return null;
    const card = document.createElement('div');
    card.className = 'preview-card preview-youtube';
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    img.loading = 'lazy';
    img.alt = 'YouTube video';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => card.remove());
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = '<span class="preview-icon">▶</span><span class="preview-label">YouTube</span>';
    a.appendChild(img);
    a.appendChild(overlay);
    card.appendChild(a);
    return card;
  }

  function twitchPillPreview(url, label) {
    const card = document.createElement('div');
    card.className = 'preview-card preview-pill';
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    card.appendChild(a);
    return card;
  }

  function isSafeEmoteUrl(u) {
    // Defense in depth: only allow https URLs with no quote characters.
    return typeof u === 'string' && /^https:\/\/[^"\s]+$/.test(u);
  }

  // ---- Third-party emotes (BTTV / FFZ / 7TV) ----
  // Each provider has a public, no-auth API. We populate `thirdPartyEmotes`
  // with text -> { url, provider } entries. Failures are silent so the chat
  // still works even if one provider is down.
  async function loadThirdPartyEmotes(channel, broadcasterId) {
    thirdPartyEmotes.clear();
    await Promise.allSettled([
      loadBTTV(broadcasterId),
      loadFFZ(channel),
      load7TV(broadcasterId),
    ]);
  }

  // ---- Twitch badges ----
  // Uses the legacy `badges.twitch.tv` endpoints which are still reachable
  // without auth. If they ever go away the renderBadges() fallback to text
  // labels remains intact, so users just see the original badge style again.
  async function loadBadges(broadcasterId) {
    badgeImages.clear();
    // Globals first so any channel-specific override (e.g. custom sub badges
    // for different tiers) wins on collision.
    await fetchBadgeSet('https://badges.twitch.tv/v1/badges/global/display');
    if (broadcasterId) {
      await fetchBadgeSet(`https://badges.twitch.tv/v1/badges/channels/${broadcasterId}/display`);
    }
  }
  async function fetchBadgeSet(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      const sets = data.badge_sets || {};
      for (const setKey of Object.keys(sets)) {
        const versions = sets[setKey].versions || {};
        for (const v of Object.keys(versions)) {
          const img = versions[v].image_url_2x || versions[v].image_url_1x;
          if (img && isSafeEmoteUrl(img)) {
            // Channel-specific entries naturally override globals (loaded later
            // by Promise.allSettled — for subscriber/bits tiers this is what
            // we want).
            badgeImages.set(`${setKey}/${v}`, img);
          }
        }
      }
    } catch (_) {
      // Silent — fall back to text badges.
    }
  }

  // ---- Pronouns (pronouns.alejo.io) ----
  // Loaded only when the Pronouns toggle is on. Two endpoints:
  //   GET /api/pronouns         — full id->definition table (cached once)
  //   GET /api/users/{login}    — per-user lookup (cached per session)
  async function loadPronounsTable() {
    if (pronounsTable) return;
    try {
      const r = await fetch('https://pronouns.alejo.io/api/pronouns');
      if (!r.ok) return;
      const arr = await r.json();
      pronounsTable = Object.create(null);
      for (const p of (Array.isArray(arr) ? arr : [])) {
        if (!p || !p.name) continue;
        pronounsTable[p.name] = p.singular ? p.subject : `${p.subject}/${p.object}`;
      }
    } catch (_) { /* silent */ }
  }

  async function fetchUserPronoun(userLower) {
    if (!pronounsEnabled) return;
    if (pronounCache.has(userLower) || pronounInFlight.has(userLower)) return;
    if (!/^[a-z0-9_]{3,25}$/.test(userLower)) return;
    pronounInFlight.add(userLower);
    try {
      if (!pronounsTable) await loadPronounsTable();
      const r = await fetch(`https://pronouns.alejo.io/api/users/${userLower}`);
      if (!r.ok) { pronounCache.set(userLower, null); return; }
      const arr = await r.json();
      const entry = Array.isArray(arr) && arr[0];
      const display = entry && pronounsTable ? (pronounsTable[entry.pronoun_id] || null) : null;
      pronounCache.set(userLower, display || null);
      if (display) backfillPronounsInDom(userLower, display);
    } catch (_) {
      pronounCache.set(userLower, null);
    } finally {
      pronounInFlight.delete(userLower);
    }
  }

  function backfillPronounsInDom(userLower, display) {
    const safeAttr = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(userLower) : userLower;
    const nodes = chat.querySelectorAll(`.msg[data-user="${safeAttr}"]`);
    for (const m of nodes) {
      if (m.querySelector('.pronouns')) continue;
      const name = m.querySelector('.name');
      if (!name) continue;
      const chip = document.createElement('span');
      chip.className = 'pronouns';
      chip.textContent = display;
      name.parentNode.insertBefore(chip, name);
    }
  }

  // ---- Channel state (slow / sub-only / emote-only / etc.) ----
  // ROOMSTATE on join carries the full set; subsequent ROOMSTATEs may carry
  // only the changed tag, so we merge into a persistent object.
  let roomStateTags = {};

  function updateChannelStateFromMsg(tags) {
    Object.assign(roomStateTags, tags);
    renderChannelState();
  }

  function renderChannelState() {
    const t = roomStateTags;
    const out = [];
    const slow = parseInt(t.slow, 10);
    if (Number.isFinite(slow) && slow > 0) out.push({ cls: 'slow', text: `Slow ${slow}s` });
    if (t['subs-only'] === '1') out.push({ cls: 'subs', text: 'Subs only' });
    if (t['emote-only'] === '1') out.push({ cls: 'emote', text: 'Emote only' });
    if (t.r9k === '1') out.push({ cls: 'r9k', text: 'Unique chat' });

    channelStateEl.innerHTML = '';
    if (out.length === 0) {
      channelStateEl.hidden = true;
      return;
    }
    channelStateEl.hidden = false;
    for (const b of out) {
      const span = document.createElement('span');
      span.className = `cs-badge ${b.cls}`;
      span.textContent = b.text;
      channelStateEl.appendChild(span);
    }
  }

  async function loadBTTV(broadcasterId) {
    // Global
    try {
      const r = await fetch('https://api.betterttv.net/3/cached/emotes/global');
      if (r.ok) {
        const list = await r.json();
        for (const e of list) registerTpe(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`, 'BTTV');
      }
    } catch (_) {}
    // Channel
    try {
      const r = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`);
      if (r.ok) {
        const data = await r.json();
        const list = [...(data.channelEmotes || []), ...(data.sharedEmotes || [])];
        for (const e of list) registerTpe(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`, 'BTTV');
      }
    } catch (_) {}
  }

  async function loadFFZ(channel) {
    try {
      const r = await fetch('https://api.frankerfacez.com/v1/set/global');
      if (r.ok) {
        const data = await r.json();
        for (const setId of Object.keys(data.sets || {})) {
          for (const e of (data.sets[setId].emoticons || [])) {
            const url = pickFfzUrl(e.urls);
            if (url) registerTpe(e.name, url, 'FFZ');
          }
        }
      }
    } catch (_) {}
    try {
      const r = await fetch(`https://api.frankerfacez.com/v1/room/${channel}`);
      if (r.ok) {
        const data = await r.json();
        for (const setId of Object.keys(data.sets || {})) {
          for (const e of (data.sets[setId].emoticons || [])) {
            const url = pickFfzUrl(e.urls);
            if (url) registerTpe(e.name, url, 'FFZ');
          }
        }
      }
    } catch (_) {}
  }

  function pickFfzUrl(urls) {
    if (!urls) return null;
    const raw = urls['2'] || urls['4'] || urls['1'];
    if (!raw) return null;
    // FFZ returns protocol-relative URLs ("//cdn.frankerfacez.com/...")
    return raw.startsWith('//') ? 'https:' + raw : raw;
  }

  async function load7TV(broadcasterId) {
    try {
      const r = await fetch('https://7tv.io/v3/emote-sets/global');
      if (r.ok) {
        const data = await r.json();
        for (const e of (data.emotes || [])) {
          registerTpe(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`, '7TV');
        }
      }
    } catch (_) {}
    try {
      const r = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`);
      if (r.ok) {
        const data = await r.json();
        const emotes = (data.emote_set && data.emote_set.emotes) || [];
        for (const e of emotes) {
          registerTpe(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`, '7TV');
        }
      }
    } catch (_) {}
  }

  function registerTpe(name, url, provider) {
    if (!name || !isSafeEmoteUrl(url)) return;
    // Channel emotes loaded later in time override globals if the name collides;
    // that matches how Twitch chat tools generally behave.
    thirdPartyEmotes.set(name, { url, provider });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // Generate a fallback color from username (Twitch does similar)
  const FALLBACK_COLORS = ['#FF0000','#0000FF','#00FF00','#B22222','#FF7F50','#9ACD32','#FF4500','#2E8B57','#DAA520','#D2691E','#5F9EA0','#1E90FF','#FF69B4','#8A2BE2','#00FF7F'];
  function fallbackColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
  }

  function handlePrivmsg(msg) {
    const tags = msg.tags;
    let text = msg.params[1] || '';

    // CTCP /me action wrapper: \u0001ACTION text\u0001
    let isAction = false;
    if (text.charCodeAt(0) === 1 && text.charCodeAt(text.length - 1) === 1) {
      isAction = true;
      text = text.slice(8, -1); // strip leading '\u0001ACTION ' and trailing '\u0001'
    }

    const username = tags['display-name'] || (msg.prefix && msg.prefix.split('!')[0]) || 'unknown';
    const userLower = ((msg.prefix && msg.prefix.split('!')[0]) || username).toLowerCase();
    const rawColor = tags['color'];
    const color = (rawColor && /^#[0-9A-Fa-f]{6}$/.test(rawColor))
      ? rawColor
      : fallbackColor(userLower);

    const isFirstMsg = tags['first-msg'] === '1';
    const bits = parseInt(tags['bits'], 10);
    const isCheer = Number.isFinite(bits) && bits > 0;
    const isBot = BOT_USERNAMES.has(userLower);
    const isHighlight = matchesKeyword(text, userLower);
    // Chat command: message starts with "!" followed by a word char. Avoids
    // catching plain "!" / "!!!" enthusiasm while still flagging "!discord",
    // "!socials", "!hi", etc.
    const isCommand = /^!\w/.test(text);

    // Twitch Power-ups (Bits-purchased message enhancements):
    //   - Gigantify an Emote → msg-id=gigantified-emote-message
    //   - Message Effects     → animation-id=<effect-name>
    // These tag names are observed in IRC traffic but aren't in the officially
    // documented IRC reference, so treat them as best-effort.
    const isGigantified = tags['msg-id'] === 'gigantified-emote-message';
    const animationId = tags['animation-id'];
    const hasMessageEffect = !!animationId && animationId.length > 0;
    const isPowerUp = isGigantified || hasMessageEffect;

    const div = document.createElement('div');
    let cls = 'msg';
    if (isAction) cls += ' action';
    if (isFirstMsg) cls += ' first-msg';
    if (isCheer) cls += ' cheer';
    if (isBot) cls += ' bot-msg';
    if (isCommand) cls += ' command-msg';
    if (isHighlight) cls += ' highlight';
    if (isPowerUp) cls += ' power-up';
    div.className = cls;
    div.dataset.user = userLower;
    // Used by the Glow-pulse entry animation. Event cards and the various
    // highlight variants set their own --glow-color in CSS; this line gives
    // regular chat messages their author's color for the same effect.
    div.style.setProperty('--glow-color', color);
    if (hasMessageEffect && /^[a-z0-9_-]+$/i.test(animationId)) {
      div.dataset.effect = animationId.toLowerCase();
    }

    const badgesHtml = renderBadges(tags['badges']);
    const pronounsHtml = renderPronounChip(userLower);
    const messageHtml = renderMessageWithEmotes(text, tags['emotes']);
    const timeHtml = `<span class="timestamp">${formatTime()}</span>`;
    const bitsHtml = isCheer ? `<span class="bits-tag">${bits} bits</span>` : '';
    const replyHtml = renderReplyContext(tags);

    div.innerHTML =
      replyHtml +
      timeHtml +
      bitsHtml +
      badgesHtml +
      pronounsHtml +
      `<span class="name" style="color:${escapeHtml(color)}">${escapeHtml(username)}</span> ` +
      `<span class="text"${isAction ? ` style="color:${escapeHtml(color)}"` : ''}>${messageHtml}</span>`;

    if (isGigantified) {
      // Gigantify a Power-up forces the indicated emote(s) huge regardless of
      // whether the message has surrounding text — so we skip the "emote-only"
      // check and apply the treatment directly. The extra `gigantified` class
      // doubles the emote size beyond the standard big-emotes treatment so the
      // paid Power-up reads visibly louder than a casual emote-only message.
      forceBigEmotes(div);
      div.classList.add('gigantified');
    } else {
      applyBigEmotesIfApplicable(div);
    }
    attachLinkPreviews(div, text);
    appendMessage(div);

    // Fire-and-forget pronoun lookup (cached, no-op if disabled or already fetched).
    if (pronounsEnabled) fetchUserPronoun(userLower);
  }

  function matchesKeyword(text, userLower) {
    if (keywords.length === 0) return false;
    // Strip URLs before matching so e.g. "raid" inside an example.com/raid URL
    // doesn't trip the highlight.
    const stripped = text.replace(/https?:\/\/\S+/gi, '');
    const lower = stripped.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw) || userLower === kw) return true;
    }
    return false;
  }

  function renderPronounChip(userLower) {
    if (!pronounsEnabled) return '';
    const p = pronounCache.get(userLower);
    if (!p) return '';
    return `<span class="pronouns">${escapeHtml(p)}</span>`;
  }

  // Twitch's "Reply" feature populates reply-parent-* tags on the IRC message.
  // Render a single-line context above the message so threading is readable.
  function renderReplyContext(tags) {
    const parentName = tags['reply-parent-display-name'];
    const parentBody = tags['reply-parent-msg-body'];
    if (!parentName || !parentBody) return '';
    const max = 100;
    const preview = parentBody.length > max ? parentBody.slice(0, max - 1) + '…' : parentBody;
    return `<div class="reply-context" title="${escapeHtml(parentBody)}">` +
      `<span class="reply-arrow">↪</span>` +
      `Replying to <span class="reply-user">@${escapeHtml(parentName)}</span>: ` +
      escapeHtml(preview) +
      `</div>`;
  }

  // Big-emote treatment: if the rendered message body contains only 1-3 emote
  // images and no other meaningful content (no text, no links), display the
  // emotes large — same behavior as iOS Messages with emoji-only messages.
  function applyBigEmotesIfApplicable(msgDiv) {
    const textSpan = msgDiv.querySelector('.text');
    if (!textSpan) return;
    const emotes = textSpan.querySelectorAll('img.emote');
    if (emotes.length === 0 || emotes.length > 3) return;
    // Bail if there's a link in the message — it's not "just emotes".
    if (textSpan.querySelector('a')) return;
    // textContent ignores <img> alt text, so any remaining whitespace-only
    // string here means the message is genuinely just emotes.
    if (textSpan.textContent.replace(/\s+/g, '') !== '') return;
    forceBigEmotes(msgDiv);
  }

  // Unconditionally apply big-emote rendering: add the class and swap each
  // emote's src to its highest-resolution CDN variant. Called by the auto
  // detector above and by the Gigantify Power-up path.
  function forceBigEmotes(msgDiv) {
    msgDiv.classList.add('big-emotes');
    const emotes = msgDiv.querySelectorAll('img.emote');
    for (const img of emotes) {
      const upscaled = upscaleEmoteUrl(img.src);
      if (upscaled !== img.src) img.src = upscaled;
    }
  }

  // Each emote provider exposes higher-res variants via predictable URL patterns.
  // Returns the original URL unchanged if the pattern doesn't match — the big
  // emote then just renders the smaller image scaled up (slightly blurry, not
  // broken).
  function upscaleEmoteUrl(url) {
    // Twitch:   .../emoticons/v2/{id}/default/dark/1.0 → /3.0
    if (url.indexOf('static-cdn.jtvnw.net/emoticons/') !== -1) {
      return url.replace(/\/(?:1|2)\.0(\?|$)/, '/3.0$1');
    }
    // BetterTTV: .../emote/{id}/2x → /3x
    if (url.indexOf('cdn.betterttv.net/emote/') !== -1) {
      return url.replace(/\/(?:1|2)x(\?|$)/, '/3x$1');
    }
    // 7TV:      .../emote/{id}/2x.webp → /4x.webp
    if (url.indexOf('cdn.7tv.app/emote/') !== -1) {
      return url.replace(/\/(?:1|2|3)x\.webp(\?|$)/, '/4x.webp$1');
    }
    // FrankerFaceZ: .../emoticon/{id}/2 → /4 (filename is just the size key)
    if (url.indexOf('cdn.frankerfacez.com/') !== -1) {
      return url.replace(/\/(?:1|2)(\?|$)/, '/4$1');
    }
    return url;
  }

  // ---- Event cards (USERNOTICE) ----
  // Each msg-id gets its own glyph so a glance at the icon tells you the event
  // type. The fallback star (★) only fires for msg-ids we haven't mapped yet.
  // Note: Twitch doesn't deliver follow events over IRC (they come from
  // EventSub/PubSub), so there's no "follow" entry here — the closest IRC
  // surfacing is the .msg.first-msg highlight, which carries its own heart
  // marker in CSS.
  const EVENT_ICONS = {
    sub: '⭐',                  // first-time paid subscription (Tier 1/2/3)
    resub: '👁',                // paid resub — eye for the watch-streak month count
    subgift: '🎁',              // single gift sub
    submysterygift: '🎲',       // mystery / community gift — randomized recipients
    anonsubgift: '👤',          // anonymous gift sub
    anongiftpaidupgrade: '⬆️',  // viewer upgraded a gifted sub to paid (anon gifter)
    giftpaidupgrade: '⬆️',      // viewer upgraded a gifted sub to paid
    primepaidupgrade: '⬆️',     // viewer upgraded from Prime to paid — also "now paying"
    raid: '⚔',                  // incoming raid
    unraid: '🚪',               // raid cancelled — exit door
    announcement: '📢',         // moderator announcement
    ritual: '✨',               // new-chatter ritual
    bitsbadgetier: '💎',        // bits-badge tier upgrade
  };

  // Pick the icon for an event card. The IRC `resub` and `sub` msg-ids fire
  // regardless of sub plan (Prime / Tier 1 / 2 / 3) — so we override to the
  // Prime crown when `msg-param-sub-plan` says Prime. Without this, a Prime
  // resub renders with the eye icon meant for the watch-streak month count,
  // which reads as wrong because Prime visually owns the crown on Twitch.
  function pickEventIcon(msgId, tags) {
    if ((msgId === 'sub' || msgId === 'resub') && tags && tags['msg-param-sub-plan'] === 'Prime') {
      return '👑';
    }
    return EVENT_ICONS[msgId] || '★';
  }

  function handleUserNotice(msg) {
    const tags = msg.tags || {};
    const msgId = tags['msg-id'] || 'unknown';
    const systemMsg = tags['system-msg'] || '';
    const userMsg = msg.params[1] || '';

    const div = document.createElement('div');
    const safeMsgId = msgId.replace(/[^a-z0-9_-]/gi, '');
    div.className = `msg event-card event-${safeMsgId}`;
    if (tags['login']) div.dataset.user = tags['login'].toLowerCase();

    const icon = pickEventIcon(msgId, tags);
    const timeHtml = `<span class="timestamp">${formatTime()}</span>`;
    let html = timeHtml +
      `<span class="event-icon">${icon}</span>` +
      `<span class="event-text">${escapeHtml(systemMsg)}</span>`;
    if (userMsg) {
      html += `<div class="event-user-msg">${renderMessageWithEmotes(userMsg, tags['emotes'])}</div>`;
    }
    div.innerHTML = html;
    appendMessage(div);
  }

  // ---- WebSocket / IRC ----
  // Twitch usernames are 4-25 chars, [a-z0-9_]. Validate before connecting so
  // typos surface as a clear error instead of a silent join failure.
  const VALID_CHANNEL = /^[a-z0-9_]{4,25}$/;

  function connect(channel) {
    channel = channel.toLowerCase().replace(/^#/, '').trim();
    if (!channel) return;
    if (!VALID_CHANNEL.test(channel)) {
      setStatus('error', 'Invalid channel name');
      addSystemMessage(`"${channel}" is not a valid Twitch channel name (4-25 chars, letters/numbers/underscore).`);
      return;
    }

    currentChannel = channel;
    localStorage.setItem(STORAGE_KEY, channel);
    intentionalClose = false;

    setStatus('connecting', `Connecting to #${channel}...`);
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = '';
    channelInput.disabled = true;

    const nick = 'justinfan' + Math.floor(Math.random() * 100000);
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.addEventListener('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send('NICK ' + nick);
      ws.send('JOIN #' + channel);
    });

    ws.addEventListener('message', (event) => {
      const lines = event.data.split('\r\n').filter(Boolean);
      for (const line of lines) {
        const msg = parseMessage(line);
        handleIrcMessage(msg, line);
      }
    });

    ws.addEventListener('error', () => {
      // We can't get useful detail out of the Error event itself. The distinction
      // between "Twitch is down" and "your internet is down" usually shows up
      // as the WebSocket failing to open at all, so phrase it accordingly.
      if (reconnectAttempts === 0) {
        setStatus('error', 'Can’t reach Twitch — check your internet');
      } else {
        setStatus('error', 'Connection error');
      }
    });

    ws.addEventListener('close', () => {
      if (intentionalClose) {
        setStatus('', 'Disconnected');
        connectBtn.style.display = '';
        disconnectBtn.style.display = 'none';
        channelInput.disabled = false;
        return;
      }
      // Auto-reconnect with backoff
      reconnectAttempts++;
      const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(reconnectAttempts, 5)));
      const seconds = Math.round(delay / 1000);
      // First drop is usually a transient blip; later drops suggest a real issue.
      const reason = reconnectAttempts <= 2
        ? 'Lost connection to Twitch'
        : `Still trying to reconnect (attempt ${reconnectAttempts}). Twitch chat may be down, or this channel name might be invalid.`;
      setStatus('error', `${reason} — retrying in ${seconds}s`);
      addSystemMessage(`${reason} — retrying in ${seconds}s…`);
      setTimeout(() => {
        if (!intentionalClose && currentChannel) connect(currentChannel);
      }, delay);
    });
  }

  function handleIrcMessage(msg, raw) {
    switch (msg.command) {
      case 'PING':
        ws.send('PONG :' + (msg.params[0] || 'tmi.twitch.tv'));
        break;
      case '001': // Welcome
        break;
      case 'JOIN':
        if (msg.prefix && msg.prefix.startsWith('justinfan')) {
          setStatus('connected', `Connected to #${currentChannel}`);
          addSystemMessage(`Joined #${currentChannel} — waiting for chat activity…`);
          reconnectAttempts = 0;
        }
        break;
      case 'PRIVMSG':
        handlePrivmsg(msg);
        break;
      case 'CLEARCHAT':
        if (msg.params.length > 1) {
          addSystemMessage(`${msg.params[1]} was timed out / banned`);
        } else {
          addSystemMessage('Chat was cleared by a moderator');
        }
        break;
      case 'CLEARMSG':
        addSystemMessage(`A message was deleted`);
        break;
      case 'NOTICE':
        addSystemMessage(`Notice: ${msg.params[1] || raw}`);
        break;
      case 'USERNOTICE':
        // Subs, gift subs, raids, announcements, etc. — render as event cards.
        handleUserNotice(msg);
        break;
      case 'ROOMSTATE':
        // First ROOMSTATE on join carries `room-id` (broadcaster's Twitch user id).
        // We need this for BTTV/7TV channel emotes and channel-specific badges.
        if (msg.tags && msg.tags['room-id'] && msg.tags['room-id'] !== roomId) {
          roomId = msg.tags['room-id'];
          loadThirdPartyEmotes(currentChannel, roomId);
          if (!document.body.classList.contains('hide-badges')) loadBadges(roomId);
        }
        // Channel-state badges (slow, subs-only, emote-only, etc.)
        updateChannelStateFromMsg(msg.tags || {});
        break;
      case 'RECONNECT':
        addSystemMessage('Server requested reconnect...');
        ws.close();
        break;
    }
  }

  function disconnect() {
    intentionalClose = true;
    if (ws) ws.close();
    ws = null;
    currentChannel = null;
    roomId = null;
    thirdPartyEmotes.clear();
    badgeImages.clear();
    roomStateTags = {};
    renderChannelState();
    resetFadeState();
  }

  // ---- UI handlers ----
  connectBtn.addEventListener('click', () => {
    const ch = channelInput.value.trim();
    if (!ch) return;
    chat.innerHTML = '';
    connect(ch);
  });
  disconnectBtn.addEventListener('click', disconnect);
  channelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
  });

  // URL hash deep-link: #channel auto-connects on load. Useful for OBS browser
  // sources or bookmarks. The hash takes precedence over the localStorage value.
  // Returns true when a connect was triggered, so the load handler knows
  // whether to fall through to the saved-channel path.
  function autoConnectFromHash() {
    const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!hash) return false;
    channelInput.value = hash;
    connectBtn.click();
    return true;
  }
  window.addEventListener('hashchange', () => {
    disconnect();
    autoConnectFromHash();
  });

  // Initial load: try hash first; otherwise reconnect to the last saved
  // channel if the Auto-reconnect toggle is enabled.
  function autoConnectOnLoad() {
    if (autoConnectFromHash()) return;
    if (!autoReconnectEnabled) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_CHANNEL.test(saved)) {
      connectBtn.click();
    }
  }
  autoConnectOnLoad();
})();
