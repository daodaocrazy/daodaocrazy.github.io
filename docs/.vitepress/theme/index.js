import { inBrowser, onContentUpdated } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'

function syncStudyPageClass() {
  if (!inBrowser) {
    return
  }

  document.body.classList.toggle('study-page', window.location.pathname.startsWith('/study/'))
}

function isExternalImage(image) {
  try {
    const imageUrl = new URL(image.currentSrc || image.src, window.location.href)
    return imageUrl.origin !== window.location.origin
  } catch {
    return false
  }
}

function cloneImageForRetry(image) {
  const retriedImage = new Image()

  retriedImage.src = image.currentSrc || image.src
  retriedImage.alt = image.alt
  retriedImage.className = image.className
  retriedImage.referrerPolicy = 'no-referrer'
  retriedImage.loading = image.loading || 'lazy'
  retriedImage.decoding = image.decoding || 'async'

  const style = image.getAttribute('style')
  if (style) {
    retriedImage.setAttribute('style', style)
  }

  return retriedImage
}

function retryBrokenExternalImages() {
  if (!inBrowser) {
    return
  }

  const images = document.querySelectorAll('.vp-doc img')

  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) {
      continue
    }

    if (!isExternalImage(image)) {
      continue
    }

    if (image.dataset.retryBound !== 'true') {
      image.dataset.retryBound = 'true'
      image.addEventListener('error', () => {
        requestAnimationFrame(retryBrokenExternalImages)
      }, { once: true })
    }

    if (!image.complete || image.naturalWidth > 0 || image.dataset.retryAttempted === 'true') {
      continue
    }

    image.dataset.retryAttempted = 'true'

    const retriedImage = cloneImageForRetry(image)
    retriedImage.dataset.retryBound = 'true'
    retriedImage.dataset.retryAttempted = 'true'

    retriedImage.addEventListener('load', () => {
      image.replaceWith(retriedImage)
    }, { once: true })
  }
}

export default {
  extends: DefaultTheme,
  Layout,
  setup() {
    onContentUpdated(() => {
      syncStudyPageClass()
      requestAnimationFrame(retryBrokenExternalImages)
    })
  }
}
