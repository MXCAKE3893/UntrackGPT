function removeTrackingParameters(urlString) {
  try {
    const url = new URL(urlString);
    let changed = false;

    const keysToRemove = [];
    for (const [key, value] of url.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      const lowerValue = value.toLowerCase();

      if (lowerKey.startsWith('utm_')) {
        keysToRemove.push(key);
      } else if (/^ut[^a-zA-Z0-9]*source$/i.test(key)) {
        keysToRemove.push(key);
      } else if (lowerValue === 'chatgpt.com') {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => url.searchParams.delete(key));
      changed = true;
    }

    return changed ? url.toString() : urlString;
  } catch (e) {
    return urlString;
  }
}

function cleanAllLinks() {
  const links = document.querySelectorAll('a[href]:not([data-link-cleaned])');
  links.forEach(link => {
    const originalHref = link.href;
    const cleanedHref = removeTrackingParameters(originalHref);

    if (originalHref !== cleanedHref) {
      link.href = cleanedHref;
      link.setAttribute('data-original-href', originalHref);
    }
    link.setAttribute('data-link-cleaned', 'true');
  });
}

cleanAllLinks();

const observer = new MutationObserver((mutations) => {
  let shouldClean = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldClean = true;
      break;
    }
    if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
      const target = mutation.target;
      if (target.tagName === 'A' && !target.hasAttribute('data-link-cleaned')) {
        shouldClean = true;
        break;
      }
    }
  }
  if (shouldClean) {
    cleanAllLinks();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['href']
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (link) {
    const originalHref = link.href;
    const cleanedHref = removeTrackingParameters(originalHref);
    if (originalHref !== cleanedHref) {
      link.href = cleanedHref;
    }
  }
}, { capture: true });


function cleanText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(https?:\/\/[^\s"'<>\)\]]+)/g, (match) => {
    return removeTrackingParameters(match);
  });
}

document.addEventListener('copy', (event) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const originalText = selection.toString();
  if (!originalText) return;

  const cleanedText = cleanText(originalText);
  if (originalText !== cleanedText) {
    event.clipboardData.setData('text/plain', cleanedText);
    event.preventDefault();
  }
});
