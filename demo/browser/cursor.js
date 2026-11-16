/*
 * Visible mouse cursor + click ripple for screen recordings (Playwright videos do
 * not capture the OS cursor). Injected into every frame by demo/record.ts.
 * Same-origin iframes forward their pointer position to the top window so a single
 * cursor glides across the page and the embedded assistant.
 */
;(function () {
  if (window.__demoCursorInstalled) return
  window.__demoCursorInstalled = true

  if (window.top !== window) {
    var forward = function (type) {
      return function (e) {
        try {
          var r = window.frameElement.getBoundingClientRect()
          window.parent.__demoCursor && window.parent.__demoCursor(type, e.clientX + r.left, e.clientY + r.top)
        } catch (err) { /* cross-origin frame: ignore */ }
      }
    }
    window.addEventListener('mousemove', forward('move'), true)
    window.addEventListener('mousedown', forward('down'), true)
    window.addEventListener('mouseup', forward('up'), true)
    return
  }

  var cursor = null
  var last = { x: -100, y: -100 }
  var svg =
    '<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 2.5l15.5 9.2-6.9 1.5 3.9 7.3-3 1.6-3.9-7.4-5.1 4.8z" fill="#0f172a" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'

  function ensure() {
    if (cursor && cursor.isConnected) return cursor
    var style = document.createElement('style')
    style.textContent =
      '#__demo_cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:30px;height:30px;' +
      'margin:-3px 0 0 -4px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transition:transform .08s ease-out;will-change:left,top}' +
      '#__demo_cursor.down{transform:scale(.85)}' +
      '.__demo_ripple{position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;' +
      'border-radius:50%;background:rgba(25,74,217,.28);border:2px solid rgba(25,74,217,.55);animation:__demo_r .55s ease-out forwards}' +
      '@keyframes __demo_r{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}'
    document.documentElement.appendChild(style)
    cursor = document.createElement('div')
    cursor.id = '__demo_cursor'
    cursor.innerHTML = svg
    document.documentElement.appendChild(cursor)
    place(last.x, last.y)
    return cursor
  }

  function place(x, y) {
    last = { x: x, y: y }
    if (!cursor) return
    cursor.style.left = x + 'px'
    cursor.style.top = y + 'px'
  }

  function handle(type, x, y) {
    ensure()
    place(x, y)
    if (type === 'down') {
      cursor.classList.add('down')
      var r = document.createElement('div')
      r.className = '__demo_ripple'
      r.style.left = x + 'px'
      r.style.top = y + 'px'
      document.documentElement.appendChild(r)
      setTimeout(function () { r.remove() }, 600)
    } else if (type === 'up') {
      cursor.classList.remove('down')
    }
  }

  window.__demoCursor = handle
  window.addEventListener('mousemove', function (e) { handle('move', e.clientX, e.clientY) }, true)
  window.addEventListener('mousedown', function (e) { handle('down', e.clientX, e.clientY) }, true)
  window.addEventListener('mouseup', function (e) { handle('up', e.clientX, e.clientY) }, true)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure)
  else ensure()
})()
