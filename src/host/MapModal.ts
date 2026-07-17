import { MAP_DOM_IDS, MAP_STORAGE_KEYS, MAP_WINDOW_SIZES, MapWindowSize } from '../data/mapConfig';
import { getHostDocument, getHostWindow } from './hostDom';

type MapModalCallbacks = {
  onOpen: (stage: HTMLElement, status: HTMLElement) => void;
  onClose: () => void;
};

export class MapModal {
  private root: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private settingsPanel: HTMLElement | null = null;
  private sizeButtons: HTMLButtonElement[] = [];
  private readonly hostDocument = getHostDocument();
  private readonly hostWindow = getHostWindow();
  private readonly callbacks: MapModalCallbacks;
  private readonly onHostViewportResize = () => this.updateViewportVariables();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  constructor(callbacks: MapModalCallbacks) {
    this.callbacks = callbacks;
  }

  /** 创建全屏弹窗 DOM，并把 Three.js 挂载容器交给应用层。 */
  open(): void {
    const existing = this.hostDocument.getElementById(MAP_DOM_IDS.modal);
    if (existing) {
      existing.focus();
      return;
    }

    this.root = this.hostDocument.createElement('section');
    this.root.id = MAP_DOM_IDS.modal;
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', '玄天界三维地图');
    this.updateViewportVariables();
    this.applyWindowSize(this.readSavedWindowSize());

    const shell = this.hostDocument.createElement('div');
    shell.className = 'xuantian-map-shell';

    this.stage = this.hostDocument.createElement('div');
    this.stage.className = 'xuantian-map-stage';

    const topbar = this.hostDocument.createElement('div');
    topbar.className = 'xuantian-map-topbar';

    const title = this.hostDocument.createElement('div');
    title.className = 'xuantian-map-title';
    title.textContent = '玄天界';

    const actions = this.hostDocument.createElement('div');
    actions.className = 'xuantian-map-actions';

    const closeButton = this.hostDocument.createElement('button');
    closeButton.className = 'xuantian-map-icon-button';
    closeButton.type = 'button';
    closeButton.title = '关闭地图';
    closeButton.setAttribute('aria-label', '关闭地图');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.close());

    const settingsButton = this.hostDocument.createElement('button');
    settingsButton.className = 'xuantian-map-icon-button';
    settingsButton.type = 'button';
    settingsButton.title = '地图设置';
    settingsButton.setAttribute('aria-label', '地图设置');
    settingsButton.textContent = '⚙';
    settingsButton.addEventListener('click', () => this.toggleSettingsPanel());

    this.settingsPanel = this.createSettingsPanel();
    this.status = this.hostDocument.createElement('div');
    this.status.className = 'xuantian-map-status';
    this.status.textContent = '正在启动三维地图核心...';

    actions.append(settingsButton, closeButton);
    topbar.append(title, actions);
    shell.append(this.stage, topbar, this.settingsPanel, this.status);
    this.root.append(shell);
    this.hostDocument.body.append(this.root);
    this.hostDocument.addEventListener('keydown', this.onKeyDown);
    this.hostWindow.addEventListener('resize', this.onHostViewportResize);
    this.hostWindow.visualViewport?.addEventListener('resize', this.onHostViewportResize);
    this.root.focus();

    this.callbacks.onOpen(this.stage, this.status);
  }

  /** 写入加载状态或错误信息。 */
  setStatus(message: string, kind: 'info' | 'error' = 'info'): void {
    if (!this.status) {
      return;
    }
    this.status.dataset.kind = kind;
    this.status.textContent = message;
  }

  /** 关闭弹窗并通知应用层释放 WebGL 资源。 */
  close(): void {
    this.callbacks.onClose();
    this.destroy();
  }

  /** 删除弹窗 DOM 和键盘监听。 */
  destroy(): void {
    this.hostDocument.removeEventListener('keydown', this.onKeyDown);
    this.hostWindow.removeEventListener('resize', this.onHostViewportResize);
    this.hostWindow.visualViewport?.removeEventListener('resize', this.onHostViewportResize);
    this.root?.remove();
    this.root = null;
    this.stage = null;
    this.status = null;
    this.settingsPanel = null;
    this.sizeButtons = [];
  }

  private createSettingsPanel(): HTMLElement {
    const panel = this.hostDocument.createElement('div');
    panel.className = 'xuantian-map-settings';
    panel.hidden = true;

    const title = this.hostDocument.createElement('div');
    title.className = 'xuantian-map-settings-title';
    title.textContent = '窗口大小';

    const options = this.hostDocument.createElement('div');
    options.className = 'xuantian-map-size-options';

    const currentSize = this.readSavedWindowSize();
    this.sizeButtons = MAP_WINDOW_SIZES.map((size) => {
      const button = this.hostDocument.createElement('button');
      button.className = 'xuantian-map-size-button';
      button.type = 'button';
      button.textContent = `${size}%`;
      button.setAttribute('aria-pressed', String(size === currentSize));
      button.addEventListener('click', () => this.setWindowSize(size));
      options.append(button);
      return button;
    });

    panel.append(title, options);
    return panel;
  }

  private toggleSettingsPanel(): void {
    if (!this.settingsPanel) {
      return;
    }

    this.settingsPanel.hidden = !this.settingsPanel.hidden;
  }

  private setWindowSize(size: MapWindowSize): void {
    this.applyWindowSize(size);
    this.hostWindow.localStorage?.setItem(MAP_STORAGE_KEYS.modalSize, String(size));
    this.sizeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.textContent === `${size}%`));
    });
  }

  private applyWindowSize(size: MapWindowSize): void {
    this.root?.setAttribute('data-window-size', String(size));
  }

  private readSavedWindowSize(): MapWindowSize {
    const saved = Number(this.hostWindow.localStorage?.getItem(MAP_STORAGE_KEYS.modalSize));
    return MAP_WINDOW_SIZES.includes(saved as MapWindowSize) ? (saved as MapWindowSize) : 100;
  }

  private updateViewportVariables(): void {
    const viewport = this.hostWindow.visualViewport;
    const width = Math.floor(viewport?.width ?? this.hostWindow.innerWidth);
    const height = Math.floor(viewport?.height ?? this.hostWindow.innerHeight);

    this.root?.style.setProperty('--xuantian-map-vw', `${Math.max(1, width)}px`);
    this.root?.style.setProperty('--xuantian-map-vh', `${Math.max(1, height)}px`);
  }
}
