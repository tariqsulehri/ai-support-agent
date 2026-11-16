/*
 * Browser-side mocks for the assistant widget, injected by demo/record.ts with
 * page.addInitScript() into every frame. Plain JS on purpose: it is not compiled.
 *
 * Overrides window.fetch for the widget's AI endpoints so the demo conversation is
 * scripted, deterministic, streamed token-by-token (like the real thing), free, and
 * needs no API keys. Nothing is sent to OpenAI and nothing is written to the database.
 *
 * Disable with DEMO_MOCK_AI=false to record against the real AI instead.
 */
;(function () {
  var data = window.__DEMO_MOCK_DATA__
  if (!data || window.__demoMocksInstalled) return
  window.__demoMocksInstalled = true

  var realFetch = window.fetch.bind(window)
  var enc = new TextEncoder()

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  function json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  function pathOf(input) {
    try {
      var url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return new URL(url, window.location.href).pathname
    } catch (e) { return '' }
  }
  async function bodyOf(input, init) {
    if (init && typeof init.body === 'string') return init.body
    if (input instanceof Request) { try { return await input.clone().text() } catch (e) { return '' } }
    return ''
  }

  /* Silent WAV whose length tracks the sentence, so the "speaking" state looks real. */
  function silentWav(seconds) {
    var rate = 8000
    var n = Math.max(1, Math.round(seconds * rate))
    var buf = new ArrayBuffer(44 + n)
    var v = new DataView(buf)
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ')
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
    str(36, 'data'); v.setUint32(40, n, true)
    for (var i = 0; i < n; i++) v.setUint8(44 + i, 128)
    return new Blob([buf], { type: 'audio/wav' })
  }

  function splitSentences(text) {
    return (text.match(/[^.!?¿¡]*[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text]).map(function (s) { return s.trim() }).filter(Boolean)
  }

  /* Streams one scripted reply as Server-Sent Events, word by word. */
  function streamReply(turn) {
    var words = turn.reply.split(/(\s+)/)
    var sentences = splitSentences(turn.reply)
    // Character offset at which each sentence is complete in the reply text.
    var ends = []
    var cursor = 0
    sentences.forEach(function (s) {
      var at = turn.reply.indexOf(s, cursor)
      cursor = at === -1 ? cursor + s.length : at + s.length
      ends.push(cursor)
    })
    return new ReadableStream({
      async start(controller) {
        function send(obj) { controller.enqueue(enc.encode('data: ' + JSON.stringify(obj) + '\n\n')) }
        await sleep(data.thinkMs || 900)
        var shownLength = 0
        var sentIdx = 0
        var leadSent = false
        for (var i = 0; i < words.length; i++) {
          shownLength += words[i].length
          send({ token: words[i] })
          if (!/^\s+$/.test(words[i])) await sleep(28 + Math.random() * 40)
          // Emit each sentence as soon as it is complete, like the real stream does.
          while (sentIdx < sentences.length && shownLength >= ends[sentIdx]) {
            send({ sentence: sentences[sentIdx] })
            sentIdx++
          }
          if (turn.lead && !leadSent && i > words.length * 0.35) { send({ lead: turn.lead }); leadSent = true }
        }
        while (sentIdx < sentences.length) { send({ sentence: sentences[sentIdx] }); sentIdx++ }
        if (turn.lead && !leadSent) send({ lead: turn.lead })
        send({ done: true, fullText: turn.reply, endCall: Boolean(turn.endCall) })
        controller.close()
      },
    })
  }

  window.fetch = async function (input, init) {
    var path = pathOf(input)

    if (path === '/api/config') return json(data.config)

    if (path === '/api/chat') {
      var body = {}
      try { body = JSON.parse(await bodyOf(input, init) || '{}') } catch (e) {}
      var msgs = Array.isArray(body.messages) ? body.messages : []
      var userTurns = msgs.filter(function (m) { return m && m.role === 'user' && m.content !== '__GREET__' }).length
      var turn = data.turns[Math.max(0, Math.min(userTurns - 1, data.turns.length - 1))]
      return new Response(streamReply(turn), { headers: { 'Content-Type': 'text/event-stream' } })
    }

    if (path === '/api/speak') {
      var sb = {}
      try { sb = JSON.parse(await bodyOf(input, init) || '{}') } catch (e) {}
      var text = String(sb.text || '')
      var secs = Math.min(3.5, Math.max(0.6, text.length * 0.045))
      // Hold the farewell so the call summary stays on screen (the widget auto-resets
      // ~1.5 s after the last audio finishes).
      if (data.holdText && text.indexOf(data.holdText) !== -1) secs = data.holdSeconds || 16
      await sleep(250)
      return new Response(silentWav(secs), { headers: { 'Content-Type': 'audio/wav' } })
    }

    if (path === '/api/transcribe') {
      await sleep(700)
      return json({ text: data.voiceTranscript })
    }

    if (path === '/api/conversation') return json({ saved: true })

    if (path === '/api/summarize') {
      await sleep(data.summaryDelayMs || 1800)
      return json(data.summary)
    }

    return realFetch(input, init)
  }
})()
