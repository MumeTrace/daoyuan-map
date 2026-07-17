import { TavernMapButton } from './host/TavernMapButton';
import { injectMapStyles } from './styles/mapStyles';

const tavernMapButton = new TavernMapButton();
let removeStyles: (() => void) | null = null;
let started = false;

/** 按酒馆助手文档等待页面就绪后启动脚本按钮绑定。 */
function startXuantianMapScript(): void {
  if (started) {
    return;
  }

  started = true;
  removeStyles = injectMapStyles();
  tavernMapButton.start();
}

/** 脚本关闭或页面卸载时释放地图窗口、监听和样式。 */
function disposeXuantianMapScript(): void {
  tavernMapButton.dispose();
  removeStyles?.();
  removeStyles = null;
}

if (typeof $ === 'function') {
  $(() => startXuantianMapScript());
  $(window).on('pagehide', disposeXuantianMapScript);
} else {
  startXuantianMapScript();
  window.addEventListener('beforeunload', disposeXuantianMapScript, { once: true });
}
