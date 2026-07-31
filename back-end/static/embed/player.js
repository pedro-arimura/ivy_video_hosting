/* IvyVideo embed player
 *
 * Usage: paste on any page
 *
 *   <div data-ivy-video="VIDEO_UUID"></div>
 *   <script src="https://YOUR_API.example.com/embed/player.js" async></script>
 *
 * The UUID of the video is read from the data-ivy-video attribute. The player
 * meters playback events (views, play clicks, watch time, mute/unmute,
 * completion) and reports them to the API.
 */
(function () {
  'use strict'

  var SCRIPT_SELECTOR = 'script[src*="/embed/player.js"]'

  function apiBase() {
    var current = document.currentScript
    var el = current && current.src ? current : document.querySelector(SCRIPT_SELECTOR)
    if (el && el.src) {
      var a = document.createElement('a')
      a.href = el.src
      return a.origin
    }
    return ''
  }

  var BASE = apiBase()

  function visitorId() {
    var KEY = 'ivy_visitor'
    var existing = null
    try {
      existing = localStorage.getItem(KEY)
    } catch (e) {
      existing = null
    }
    if (existing) return existing
    var id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    try {
      localStorage.setItem(KEY, id)
    } catch (e) {
      /* localStorage unavailable; id is still unique for this page load */
    }
    return id
  }

  var VISITOR = visitorId()

  function findContainer() {
    return document.querySelector('[data-ivy-video]')
  }

  function send(videoId, type, extra) {
    var payload = {
      type: type,
      visitor_id: VISITOR,
      position: Math.round((video && video.currentTime) || 0),
    }
    if (extra) {
      for (var key in extra) payload[key] = extra[key]
    }
    var url = BASE + '/videos/' + videoId + '/events'
    var body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
        return
      } catch (e) {
        /* fall through to fetch */
      }
    }
    if (window.fetch) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function () {})
    }
  }

  var video = null

  function init() {
    var container = findContainer()
    if (!container) return

    var videoId = container.getAttribute('data-ivy-video')
    if (!videoId) return

    var autoplay = container.getAttribute('data-autoplay') === 'true'

    container.innerHTML = ''
    container.className = (container.className + ' ivy-embed').replace(/^ /, '')

    video = document.createElement('video')
    video.src = BASE + '/videos/' + videoId + '/stream'
    video.controls = true
    video.preload = 'metadata'
    video.setAttribute('playsinline', '')
    video.style.width = '100%'
    video.style.aspectRatio = '16 / 9'
    video.style.background = '#000'
    container.appendChild(video)

    var started = false
    var watchAccum = 0
    var lastTick = 0

    function reportWatch() {
      if (watchAccum >= 0.5) {
        send(videoId, 'watch', { seconds: Math.round(watchAccum * 10) / 10 })
        watchAccum = 0
      }
      lastTick = Date.now()
    }

    video.addEventListener('play', function () {
      if (!started) {
        started = true
        send(videoId, 'view')
      }
      send(videoId, 'play')
      lastTick = Date.now()
    })

    video.addEventListener('pause', function () {
      reportWatch()
      send(videoId, 'pause')
    })

    video.addEventListener('timeupdate', function () {
      if (video.paused || video.seeking) return
      var now = Date.now()
      if (lastTick) watchAccum += (now - lastTick) / 1000
      lastTick = now
      if (watchAccum >= 10) reportWatch()
    })

    video.addEventListener('ended', function () {
      reportWatch()
      send(videoId, 'ended')
    })

    video.addEventListener('seeked', function () {
      send(videoId, 'seek')
    })

    video.addEventListener('volumechange', function () {
      if (!started) return
      send(videoId, video.muted ? 'mute' : 'unmute')
    })

    window.addEventListener('pagehide', reportWatch)

    if (autoplay) {
      var playPromise = video.play()
      if (playPromise && playPromise.catch) playPromise.catch(function () {})
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
