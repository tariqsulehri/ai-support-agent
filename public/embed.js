;(function () {
  'use strict'

  // ── 1. Detect the parent page's primary brand color ──────────────────────
  //
  //  Priority order:
  //   a) Common CSS custom properties (--primary, --brand-color, etc.)
  //   b) Computed background-color of the first CTA/primary button
  //   c) Computed background-color of <header> or <nav>
  //   d) null  →  widget keeps its own default theme

  var CSS_VAR_CANDIDATES = [
    '--primary',
    '--primary-color',
    '--brand-color',
    '--color-primary',
    '--theme-primary',
    '--accent-color',
    '--accent',
    '--brand',
  ]

  var BUTTON_SELECTORS = [
    'button[class*="primary"]',
    'a[class*="primary"]',
    '.btn-primary',
    '.button-primary',
    '[data-brand]',
  ]

  function rgbToHex(rgb) {
    var m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!m) return null
    var r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3])
    // Skip black/white/transparent
    if ((r + g + b < 30) || (r + g + b > 720)) return null
    return '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0')
  }

  function detectPrimaryColor() {
    var root = document.documentElement
    var style = getComputedStyle(root)

    // a) CSS variables
    for (var i = 0; i < CSS_VAR_CANDIDATES.length; i++) {
      var val = style.getPropertyValue(CSS_VAR_CANDIDATES[i]).trim()
      if (val && /^#[0-9a-fA-F]{6}$/.test(val)) return val
      if (val && /^#[0-9a-fA-F]{3}$/.test(val)) {
        // Expand shorthand #rgb → #rrggbb
        return '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
      }
    }

    // b) Primary/CTA button
    for (var j = 0; j < BUTTON_SELECTORS.length; j++) {
      var el = document.querySelector(BUTTON_SELECTORS[j])
      if (el) {
        var color = rgbToHex(getComputedStyle(el).backgroundColor)
        if (color) return color
      }
    }

    // c) Header / nav background
    var header = document.querySelector('header') || document.querySelector('nav')
    if (header) {
      var hColor = rgbToHex(getComputedStyle(header).backgroundColor)
      if (hColor) return hColor
    }

    return null
  }

  // ── 2. Build iframe URL ───────────────────────────────────────────────────

  var BASE_URL    = 'https://ai-support-agent-navy.vercel.app/voice'
  var TENANT      = 'tkxel'
  var TOKEN       = 'tkxelToken123Abcd'

  var primaryColor = detectPrimaryColor()

  var src = BASE_URL +
    '?tenant=' + encodeURIComponent(TENANT) +
    '&token='  + encodeURIComponent(TOKEN)

  if (primaryColor) {
    src += '&primaryColor=' + encodeURIComponent(primaryColor)
  }

  // ── 3. Inject iframe (lazy — only on first open) ──────────────────────────

  var container = document.getElementById('voice-agent-container')
  var iframe    = null
  var isLoaded  = false

  function open() {
    if (!container) return
    if (!isLoaded) {
      iframe = document.createElement('iframe')
      iframe.src                         = src
      iframe.allow                       = 'microphone; autoplay'
      iframe.style.cssText               = 'border:none;width:100%;height:100%;'
      iframe.setAttribute('title',        'AI Support Agent')
      iframe.setAttribute('loading',      'lazy')
      container.innerHTML = ''
      container.appendChild(iframe)
      isLoaded = true
    }
    container.style.display = 'block'
  }

  // ── 4. postMessage bridge ─────────────────────────────────────────────────
  //
  //  • voice-agent:ready  →  we re-send the detected theme (in case it changed
  //                          after first load, e.g. user toggled dark mode)
  //  • voice-agent:close  →  hide the container

  window.addEventListener('message', function (e) {
    if (!iframe || e.source !== iframe.contentWindow) return

    if (e.data && e.data.type === 'voice-agent:ready' && primaryColor) {
      iframe.contentWindow.postMessage({
        type:   'voice-agent:theme',
        colors: { primary: primaryColor },
      }, '*')
    }

    if (e.data && e.data.type === 'voice-agent:close') {
      if (container) container.style.display = 'none'
    }
  })

  // ── 5. Public API ─────────────────────────────────────────────────────────

  window.VoiceAgent = { open: open }

  // Auto-open if container is already visible in the DOM
  if (container && container.dataset.autoOpen !== 'false') open()

})()
