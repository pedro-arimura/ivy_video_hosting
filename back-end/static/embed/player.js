/* IvyVideo embed player
 *
 * Usage: paste on any page
 *
 *   <div data-ivy-video="VIDEO_UUID"></div>
 *   <script src="https://YOUR_API.example.com/embed/player.js" async></script>
 *
 * The UUID of the video is read from the data-ivy-video attribute. Playback
 * settings (autoplay, cover image, playback speeds, cover click behavior) are
 * loaded from the API and can be overridden per embed with attributes:
 *
 *   data-autoplay="true" | "false"
 *   data-cover-action="restart" | "resume"
 *   data-cover="https://.../image.jpg"
 *   data-speed="1.5"
 *
 * The player meters playback events (views, play clicks, watch time,
 * mute/unmute, completion) and reports them to the API.
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

  var DEFAULT_SETTINGS = {
    autoplay: false,
    cover_action: 'restart',
    cover_image_url: '',
    cover_play_color: '#ffffff',
    cover_play_background: '#1a1a1a',
    playback_rates: [0.5, 0.75, 1, 1.25, 1.5, 2],
    default_playback_rate: 1,
  }

  var PLAY_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
  var PAUSE_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'
  var VOLUME_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.59 1.41a2 2 0 0 1 0 2.83 2 2 0 0 1 0-2.83z"/><path d="M16.5 4.5a6 6 0 0 1 0 15 1 1 0 1 0 .85 1.53 8 8 0 0 0 0-18A1 1 0 1 0 16.5 4.5z"/></svg>'
  var MUTED_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="m22 9.41-1.41-1.41L16 12.59 11.41 8 10 9.41 14.59 14 10 18.59 11.41 20 16 15.41 20.59 20 22 18.59 17.41 14z"/></svg>'

  var STYLE_ID = 'ivy-embed-style'

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    var css = '' +
      '.ivy-embed{position:relative;width:100%;overflow:hidden;line-height:1.4;background:#000}' +
      '.ivy-embed video{display:block;width:100%;aspect-ratio:16/9;background:#000}' +
      '.ivy-embed .ivy-cover{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;' +
      'background:#111 no-repeat center center/cover;cursor:pointer}' +
      '.ivy-embed .ivy-cover-btn{display:flex;align-items:center;justify-content:center;width:68px;height:68px;' +
      'border-radius:50%;border:none;cursor:pointer;padding:0;transition:transform .12s ease;box-shadow:0 4px 18px rgba(0,0,0,.4)}' +
      '.ivy-embed .ivy-cover-btn:hover{transform:scale(1.08)}' +
      '.ivy-embed .ivy-cover-btn svg{width:40%;height:40%}' +
      '.ivy-embed .ivy-controls{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:10px;' +
      'padding:10px 12px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;opacity:0;' +
      'transition:opacity .2s ease;pointer-events:none;box-sizing:border-box}' +
      '.ivy-embed.ivy-controls-on .ivy-controls{opacity:1;pointer-events:auto}' +
      '.ivy-embed .ivy-btn{background:none;border:none;color:#fff;cursor:pointer;padding:2px;display:flex;align-items:center}' +
      '.ivy-embed .ivy-btn svg{width:20px;height:20px}' +
      '.ivy-embed .ivy-btn:focus-visible{outline:1px solid rgba(255,255,255,.8);outline-offset:2px}' +
      '.ivy-embed .ivy-progress{flex:1;min-width:0;accent-color:#fff;cursor:pointer}' +
      '.ivy-embed .ivy-time{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.ivy-embed .ivy-speed{font-size:12px;padding:4px 8px;border-radius:5px;background:rgba(0,0,0,.45);' +
      'color:#fff;border:none;cursor:pointer;min-width:40px}'
    var style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = css
    document.head.appendChild(style)
  }

  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0
    var s = Math.floor(seconds % 60)
    var m = Math.floor(seconds / 60) % 60
    var h = Math.floor(seconds / 3600)
    var pad = function (n) { return (n < 10 ? '0' : '') + n }
    return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s)
  }

  function resolveUrl(url) {
    if (!url) return ''
    if (url.indexOf('//') === 0) return url
    if (url.charAt(0) === '/') return BASE + url
    return url
  }

  var currentVideo = null

  function send(videoId, type, extra) {
    var payload = {
      type: type,
      visitor_id: VISITOR,
      position: Math.round((currentVideo && currentVideo.currentTime) || 0),
    }
    if (extra) {
      for (var key in extra) payload[key] = extra[key]
    }
    var url = BASE + '/videos/' + videoId + '/events'
    var body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      // A string body is sent as text/plain, which is a CORS-simple type and
      // needs no preflight, so it works cross-origin and survives page unload.
      try {
        navigator.sendBeacon(url, body)
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

  function loadSettings(videoId, container) {
    var settings = Object.assign({}, DEFAULT_SETTINGS)
    return fetch(BASE + '/videos/' + videoId)
      .then(function (res) {
        if (!res.ok) throw new Error('fetch failed')
        return res.json()
      })
      .then(function (data) {
        if (data && data.settings) {
          for (var key in data.settings) {
            if (data.settings[key] !== undefined) settings[key] = data.settings[key]
          }
        }
      })
      .catch(function () {})
      .then(function () {
        var attr = container.getAttribute('data-autoplay')
        if (attr !== null) settings.autoplay = attr === 'true'
        attr = container.getAttribute('data-cover-action')
        if (attr !== null) settings.cover_action = attr
        attr = container.getAttribute('data-cover')
        if (attr) settings.cover_image_url = attr
        attr = container.getAttribute('data-speed')
        if (attr) {
          var rate = parseFloat(attr)
          if (isFinite(rate) && rate > 0) settings.default_playback_rate = rate
        }
        return settings
      })
  }

  function initPlayer(container) {
    var videoId = container.getAttribute('data-ivy-video')
    if (!videoId) return

    container.innerHTML = ''
    container.className = (container.className + ' ivy-embed').replace(/^ /, '')

    var video = document.createElement('video')
    video.src = BASE + '/videos/' + videoId + '/stream'
    video.preload = 'metadata'
    video.setAttribute('playsinline', '')
    video.style.width = '100%'
    video.style.aspectRatio = '16 / 9'
    video.style.background = '#000'
    currentVideo = video
    container.appendChild(video)

    var cover = document.createElement('div')
    cover.className = 'ivy-cover'
    cover.setAttribute('role', 'button')
    cover.setAttribute('tabindex', '0')
    cover.setAttribute('aria-label', 'Play video with sound')
    var coverBtn = document.createElement('button')
    coverBtn.className = 'ivy-cover-btn'
    coverBtn.setAttribute('type', 'button')
    coverBtn.innerHTML = PLAY_ICON
    cover.appendChild(coverBtn)
    container.appendChild(cover)

    var controlsEl = document.createElement('div')
    controlsEl.className = 'ivy-controls'

    var playBtn = document.createElement('button')
    playBtn.className = 'ivy-btn'
    playBtn.setAttribute('type', 'button')
    playBtn.setAttribute('aria-label', 'Play')
    playBtn.innerHTML = PLAY_ICON

    var progress = document.createElement('input')
    progress.className = 'ivy-progress'
    progress.type = 'range'
    progress.min = '0'
    progress.max = '0'
    progress.value = '0'
    progress.setAttribute('aria-label', 'Seek')

    var timeEl = document.createElement('span')
    timeEl.className = 'ivy-time'
    timeEl.textContent = '0:00 / 0:00'

    var speedBtn = document.createElement('button')
    speedBtn.className = 'ivy-speed'
    speedBtn.setAttribute('type', 'button')
    speedBtn.setAttribute('aria-label', 'Playback speed')

    var muteBtn = document.createElement('button')
    muteBtn.className = 'ivy-btn'
    muteBtn.setAttribute('type', 'button')
    muteBtn.setAttribute('aria-label', 'Mute')
    muteBtn.innerHTML = VOLUME_ICON

    controlsEl.appendChild(playBtn)
    controlsEl.appendChild(progress)
    controlsEl.appendChild(timeEl)
    controlsEl.appendChild(speedBtn)
    controlsEl.appendChild(muteBtn)
    container.appendChild(controlsEl)

    var settings = Object.assign({}, DEFAULT_SETTINGS)
    var started = false
    var watchAccum = 0
    var lastTick = 0
    var coverHidden = false
    var hideTimer = null

    function reportWatch() {
      if (watchAccum >= 0.5) {
        send(videoId, 'watch', { seconds: Math.round(watchAccum * 10) / 10 })
        watchAccum = 0
      }
      lastTick = Date.now()
    }

    function showControls() {
      container.classList.add('ivy-controls-on')
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
      if (!video.paused && !video.ended) {
        hideTimer = setTimeout(function () {
          container.classList.remove('ivy-controls-on')
        }, 2500)
      }
    }

    function refreshControls() {
      playBtn.innerHTML = video.paused || video.ended ? PLAY_ICON : PAUSE_ICON
      playBtn.setAttribute('aria-label', video.paused ? 'Play' : 'Pause')
      muteBtn.innerHTML = video.muted ? MUTED_ICON : VOLUME_ICON
      muteBtn.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute')
      if (isFinite(video.duration) && video.duration > 0) {
        progress.max = String(video.duration)
      }
      progress.value = String(video.currentTime)
      timeEl.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration)
    }

    function hideCover() {
      if (coverHidden) return
      coverHidden = true
      if (cover.parentNode) cover.parentNode.removeChild(cover)
    }

    function activateWithSound() {
      video.muted = false
      if (settings.cover_action === 'restart') {
        video.currentTime = 0
      }
      var p = video.play()
      if (p && p.catch) p.catch(function () {})
      hideCover()
    }

    function cycleSpeed() {
      var rates = settings.playback_rates && settings.playback_rates.length
        ? settings.playback_rates
        : DEFAULT_SETTINGS.playback_rates
      var idx = rates.indexOf(video.playbackRate)
      var next = idx === -1 ? 0 : (idx + 1) % rates.length
      video.playbackRate = rates[next]
      speedBtn.textContent = rates[next] + '×'
      showControls()
    }

    cover.addEventListener('click', function (e) {
      e.preventDefault()
      activateWithSound()
    })
    cover.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activateWithSound()
      }
    })

    playBtn.addEventListener('click', function () {
      if (video.paused || video.ended) {
        video.play().catch(function () {})
      } else {
        video.pause()
      }
      showControls()
    })

    muteBtn.addEventListener('click', function () {
      video.muted = !video.muted
      showControls()
    })

    speedBtn.addEventListener('click', cycleSpeed)

    var seeking = false
    progress.addEventListener('input', function () {
      seeking = true
      video.currentTime = parseFloat(progress.value)
    })
    progress.addEventListener('change', function () {
      seeking = false
      send(videoId, 'seek')
      showControls()
    })

    container.addEventListener('mousemove', showControls)
    container.addEventListener('touchstart', showControls, { passive: true })
    container.addEventListener('mouseleave', function () {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
      if (!video.paused) container.classList.remove('ivy-controls-on')
    })

    video.addEventListener('play', function () {
      if (!started) {
        started = true
        send(videoId, 'view')
      }
      send(videoId, 'play')
      lastTick = Date.now()
      refreshControls()
      showControls()
    })

    video.addEventListener('pause', function () {
      reportWatch()
      send(videoId, 'pause')
      refreshControls()
      showControls()
    })

    video.addEventListener('timeupdate', function () {
      if (!seeking) progress.value = String(video.currentTime)
      timeEl.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration)
      if (video.paused || video.seeking) return
      var now = Date.now()
      if (lastTick) watchAccum += (now - lastTick) / 1000
      lastTick = now
      if (watchAccum >= 10) reportWatch()
    })

    video.addEventListener('loadedmetadata', function () {
      if (settings.default_playback_rate > 0) {
        video.playbackRate = settings.default_playback_rate
      }
      var rates = settings.playback_rates && settings.playback_rates.length
        ? settings.playback_rates
        : DEFAULT_SETTINGS.playback_rates
      speedBtn.textContent = video.playbackRate + '×'
      var idx = rates.indexOf(video.playbackRate)
      if (idx === -1) rates.push(video.playbackRate)
      refreshControls()
      showControls()
    })

    video.addEventListener('durationchange', refreshControls)

    video.addEventListener('ended', function () {
      reportWatch()
      send(videoId, 'ended')
      refreshControls()
      showControls()
    })

    video.addEventListener('seeked', function () {
      send(videoId, 'seek')
    })

    video.addEventListener('volumechange', function () {
      if (!started) return
      send(videoId, video.muted ? 'mute' : 'unmute')
      refreshControls()
    })

    video.addEventListener('ratechange', function () {
      speedBtn.textContent = video.playbackRate + '×'
    })

    window.addEventListener('pagehide', reportWatch)

    loadSettings(videoId, container).then(function (loaded) {
      settings = loaded
      var coverUrl = settings.cover_image_url ? resolveUrl(settings.cover_image_url) : ''
      if (coverUrl) {
        cover.style.backgroundImage = 'url("' + coverUrl.replace(/["\\]/g, '') + '")'
        video.setAttribute('poster', coverUrl)
      }
      coverBtn.style.color = settings.cover_play_color
      coverBtn.style.background = settings.cover_play_background

      if (settings.autoplay) {
        video.muted = true
        var p = video.play()
        if (p && p.catch) p.catch(function () {})
      }
    })
  }

  ensureStyles()

  function init() {
    var containers = Array.prototype.slice.call(document.querySelectorAll('[data-ivy-video]'))
    containers.forEach(initPlayer)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
