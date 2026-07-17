/** 获取酒馆主页面文档；JS-Slash-Runner 脚本自身运行在隐藏 iframe 中。 */
export function getHostDocument(): Document {
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      return window.parent.document;
    }
  } catch {
    return document;
  }

  return document;
}

/** 获取酒馆主页面窗口，用于尺寸、DPR 和事件循环。 */
export function getHostWindow(): Window {
  return getHostDocument().defaultView ?? window;
}
