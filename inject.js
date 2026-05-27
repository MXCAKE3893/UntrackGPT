(function () {
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

  function cleanText(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/(https?:\/\/[^\s"'<>\)\]]+)/g, (match) => {
      return removeTrackingParameters(match);
    });
  }

  const originalWriteText = Clipboard.prototype.writeText;
  Clipboard.prototype.writeText = function (text) {
    return originalWriteText.call(this, cleanText(text));
  };

  const originalWrite = Clipboard.prototype.write;
  Clipboard.prototype.write = function (data) {
    if (Array.isArray(data)) {
      const cleanedData = data.map(item => {
        if (item instanceof ClipboardItem) {
          const types = item.types;
          const newParts = {};
          let hasTextType = false;
          for (const type of types) {
            if (type === 'text/plain' || type === 'text/html') {
              hasTextType = true;
              newParts[type] = item.getType(type).then(blob =>
                blob.text().then(text => new Blob([cleanText(text)], { type }))
              );
            } else {
              newParts[type] = item.getType(type);
            }
          }
          if (hasTextType) {
            const resolvedParts = {};
            const promises = Object.entries(newParts).map(([type, promise]) =>
              promise.then(blob => { resolvedParts[type] = blob; })
            );
            return Promise.all(promises).then(() => new ClipboardItem(resolvedParts));
          }
        }
        return Promise.resolve(item);
      });
      return Promise.all(cleanedData).then(items =>
        originalWrite.call(this, items)
      );
    }
    return originalWrite.call(this, data);
  };
})();
