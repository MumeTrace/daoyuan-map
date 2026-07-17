import { MapApplication } from '../app/MapApplication';
import { MAP_BUTTON_NAME, MAP_DOM_IDS, MAP_STORAGE_KEYS } from '../data/mapConfig';
import { getHostDocument, getHostWindow } from './hostDom';
import { MapModal } from './MapModal';

export class TavernMapButton {
  private modal: MapModal | null = null;
  private application: MapApplication | null = null;
  private fallbackButton: HTMLButtonElement | null = null;
  private floatingButton: HTMLButtonElement | null = null;
  private eventStopper: TavernEventStopper | null = null;
  private readonly hostDocument = getHostDocument();
  private readonly hostWindow = getHostWindow();
  private isDraggingFloatingButton = false;
  private hasMovedFloatingButton = false;
  private floatingPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartLeft = 0;
  private dragStartTop = 0;
  private readonly onFloatingPointerMove = (event: PointerEvent) => this.moveFloatingButton(event);
  private readonly onFloatingPointerUp = (event: PointerEvent) => this.releaseFloatingButton(event);
  private readonly onHostViewportResize = () => this.clampFloatingButtonToViewport();

  /** 注册酒馆助手脚本按钮，并注入主页面悬浮入口保证隐藏 iframe 中也可打开。 */
  start(): void {
    this.updateScriptInfo();
    const registered = this.registerTavernButton();
    this.installFloatingButton();
    this.hostWindow.addEventListener('resize', this.onHostViewportResize);
    this.hostWindow.visualViewport?.addEventListener('resize', this.onHostViewportResize);
    if (!registered) {
      this.installFallbackButton();
    }
  }

  /** 主动释放按钮监听和已打开的地图实例。 */
  dispose(): void {
    this.eventStopper?.stop();
    this.eventStopper = null;
    this.hostDocument.removeEventListener('pointermove', this.onFloatingPointerMove);
    this.hostDocument.removeEventListener('pointerup', this.onFloatingPointerUp);
    this.hostDocument.removeEventListener('pointercancel', this.onFloatingPointerUp);
    this.hostWindow.removeEventListener('resize', this.onHostViewportResize);
    this.hostWindow.visualViewport?.removeEventListener('resize', this.onHostViewportResize);
    this.fallbackButton?.remove();
    this.fallbackButton = null;
    this.floatingButton?.remove();
    this.floatingButton = null;
    this.destroyMap();
  }

  private registerTavernButton(): boolean {
    if (!this.hasTavernButtonApi()) {
      return false;
    }

    this.ensureMapButtonVisible();
    const eventType = getButtonEvent(MAP_BUTTON_NAME);
    const maybeStopper = eventOn(eventType, () => this.openMap());
    this.eventStopper = maybeStopper && 'stop' in maybeStopper ? maybeStopper : null;
    return true;
  }

  private ensureMapButtonVisible(): void {
    if (typeof replaceScriptButtons === 'function') {
      replaceScriptButtons([{ name: MAP_BUTTON_NAME, visible: true }]);
      return;
    }

    if (typeof updateScriptButtonsWith === 'function') {
      updateScriptButtonsWith((buttons) => {
        const existing = buttons.find((button) => button.name === MAP_BUTTON_NAME);
        if (existing) {
          return buttons.map((button) =>
            button.name === MAP_BUTTON_NAME ? { ...button, visible: true } : button,
          );
        }

        return [...buttons, { name: MAP_BUTTON_NAME, visible: true }];
      });
      return;
    }

    appendInexistentScriptButtons([{ name: MAP_BUTTON_NAME, visible: true }]);
  }

  private openMap(): void {
    if (this.hostDocument.getElementById(MAP_DOM_IDS.modal)) {
      return;
    }

    this.application = new MapApplication();
    this.modal = new MapModal({
      onOpen: (stage, status) => this.application?.mount(stage, status),
      onClose: () => this.destroyMap(),
    });
    this.modal.open();
  }

  private destroyMap(): void {
    this.application?.dispose();
    this.application = null;
    this.modal?.destroy();
    this.modal = null;
  }

  private installFallbackButton(): void {
    if (this.hostDocument.getElementById(MAP_DOM_IDS.fallbackButton)) {
      return;
    }

    this.fallbackButton = this.hostDocument.createElement('button');
    this.fallbackButton.id = MAP_DOM_IDS.fallbackButton;
    this.fallbackButton.type = 'button';
    this.fallbackButton.textContent = MAP_BUTTON_NAME;
    this.fallbackButton.addEventListener('click', () => this.openMap());
    this.hostDocument.body.append(this.fallbackButton);
  }

  private installFloatingButton(): void {
    const existing = this.hostDocument.getElementById(MAP_DOM_IDS.floatingButton);
    if (existing) {
      existing.remove();
    }

    this.floatingButton = this.hostDocument.createElement('button');
    this.floatingButton.id = MAP_DOM_IDS.floatingButton;
    this.floatingButton.type = 'button';
    this.floatingButton.title = '打开玄天界三维地图';
    this.floatingButton.setAttribute('aria-label', '打开玄天界三维地图');
    this.floatingButton.textContent = MAP_BUTTON_NAME;
    this.floatingButton.addEventListener('pointerdown', (event) => this.startFloatingButtonDrag(event));
    this.floatingButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openMap();
      }
    });
    this.hostDocument.body.append(this.floatingButton);
    this.restoreFloatingButtonPosition(this.floatingButton);
  }

  private startFloatingButtonDrag(event: PointerEvent): void {
    if (event.button !== 0 || !this.floatingButton) {
      return;
    }

    event.preventDefault();
    const rect = this.floatingButton.getBoundingClientRect();
    this.isDraggingFloatingButton = true;
    this.hasMovedFloatingButton = false;
    this.floatingPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartLeft = rect.left;
    this.dragStartTop = rect.top;
    this.floatingButton.style.left = `${rect.left}px`;
    this.floatingButton.style.top = `${rect.top}px`;
    this.floatingButton.style.right = 'auto';
    this.floatingButton.style.bottom = 'auto';
    this.floatingButton.setPointerCapture?.(event.pointerId);
    this.hostDocument.addEventListener('pointermove', this.onFloatingPointerMove);
    this.hostDocument.addEventListener('pointerup', this.onFloatingPointerUp);
    this.hostDocument.addEventListener('pointercancel', this.onFloatingPointerUp);
  }

  private moveFloatingButton(event: PointerEvent): void {
    if (!this.isDraggingFloatingButton || !this.floatingButton || event.pointerId !== this.floatingPointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    this.hasMovedFloatingButton = this.hasMovedFloatingButton || Math.hypot(deltaX, deltaY) > 4;

    const viewport = this.getViewportSize();
    const maxLeft = Math.max(0, viewport.width - this.floatingButton.offsetWidth);
    const maxTop = Math.max(0, viewport.height - this.floatingButton.offsetHeight);
    const nextLeft = Math.max(0, Math.min(this.dragStartLeft + deltaX, maxLeft));
    const nextTop = Math.max(0, Math.min(this.dragStartTop + deltaY, maxTop));

    this.floatingButton.style.left = `${nextLeft}px`;
    this.floatingButton.style.top = `${nextTop}px`;
  }

  private releaseFloatingButton(event: PointerEvent): void {
    if (!this.isDraggingFloatingButton || !this.floatingButton || event.pointerId !== this.floatingPointerId) {
      return;
    }

    event.preventDefault();
    this.floatingButton.releasePointerCapture?.(event.pointerId);
    this.hostDocument.removeEventListener('pointermove', this.onFloatingPointerMove);
    this.hostDocument.removeEventListener('pointerup', this.onFloatingPointerUp);
    this.hostDocument.removeEventListener('pointercancel', this.onFloatingPointerUp);

    const rect = this.floatingButton.getBoundingClientRect();
    this.hostWindow.localStorage?.setItem(
      MAP_STORAGE_KEYS.floatingButtonPosition,
      JSON.stringify({ left: rect.left, top: rect.top }),
    );

    const shouldOpen = !this.hasMovedFloatingButton;
    this.isDraggingFloatingButton = false;
    this.hasMovedFloatingButton = false;
    this.floatingPointerId = null;

    if (shouldOpen) {
      this.openMap();
    }
  }

  private restoreFloatingButtonPosition(button: HTMLButtonElement): void {
    const raw = this.hostWindow.localStorage?.getItem(MAP_STORAGE_KEYS.floatingButtonPosition);
    if (!raw) {
      return;
    }

    try {
      const position = JSON.parse(raw) as { left?: number; top?: number };
      if (typeof position.left !== 'number' || typeof position.top !== 'number') {
        return;
      }

      const viewport = this.getViewportSize();
      const buttonSize = this.getFloatingButtonSize(button);
      const maxLeft = Math.max(0, viewport.width - buttonSize.width);
      const maxTop = Math.max(0, viewport.height - buttonSize.height);
      button.style.left = `${Math.max(0, Math.min(position.left, maxLeft))}px`;
      button.style.top = `${Math.max(0, Math.min(position.top, maxTop))}px`;
      button.style.right = 'auto';
      button.style.bottom = 'auto';
    } catch {
      this.hostWindow.localStorage?.removeItem(MAP_STORAGE_KEYS.floatingButtonPosition);
    }
  }

  private clampFloatingButtonToViewport(): void {
    if (!this.floatingButton) {
      return;
    }

    const rect = this.floatingButton.getBoundingClientRect();
    const viewport = this.getViewportSize();
    const maxLeft = Math.max(0, viewport.width - rect.width);
    const maxTop = Math.max(0, viewport.height - rect.height);
    const nextLeft = Math.max(0, Math.min(rect.left, maxLeft));
    const nextTop = Math.max(0, Math.min(rect.top, maxTop));
    this.floatingButton.style.left = `${nextLeft}px`;
    this.floatingButton.style.top = `${nextTop}px`;
    this.floatingButton.style.right = 'auto';
    this.floatingButton.style.bottom = 'auto';
  }

  private getViewportSize(): { width: number; height: number } {
    const visualViewport = this.hostWindow.visualViewport;
    return {
      width: Math.floor(visualViewport?.width ?? this.hostWindow.innerWidth),
      height: Math.floor(visualViewport?.height ?? this.hostWindow.innerHeight),
    };
  }

  private getFloatingButtonSize(button: HTMLButtonElement): { width: number; height: number } {
    const rect = button.getBoundingClientRect();
    return {
      width: rect.width || 52,
      height: rect.height || 52,
    };
  }

  private updateScriptInfo(): void {
    if (typeof replaceScriptInfo !== 'function') {
      return;
    }

    replaceScriptInfo('玄天界三维地图查看器。当前 Phase 1：地图按钮、全屏弹窗、空 Three.js 场景和关闭销毁流程。');
  }

  private hasTavernButtonApi(): boolean {
    return (
      (typeof replaceScriptButtons === 'function' ||
        typeof updateScriptButtonsWith === 'function' ||
        typeof appendInexistentScriptButtons === 'function') &&
      typeof getButtonEvent === 'function' &&
      typeof eventOn === 'function'
    );
  }
}
