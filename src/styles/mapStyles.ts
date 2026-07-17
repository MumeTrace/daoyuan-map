import { MAP_DOM_IDS } from '../data/mapConfig';
import { getHostDocument } from '../host/hostDom';

export const MAP_STYLE_TEXT = `
#${MAP_DOM_IDS.modal} {
  --xuantian-map-vw: 100vw;
  --xuantian-map-vh: 100vh;
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vw;
  width: var(--xuantian-map-vw);
  height: 100vh;
  height: 100dvh;
  height: var(--xuantian-map-vh);
  transform: translate(-50%, -50%);
  z-index: 99999;
  color: #f5e6c8;
  background: radial-gradient(circle at 50% 20%, #233648 0%, #0b1018 58%, #05070b 100%);
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  border: 1px solid rgba(232, 195, 126, 0.24);
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.58);
  overflow: hidden;
  box-sizing: border-box;
}

#${MAP_DOM_IDS.modal}[data-window-size="25"] {
  width: 25vw;
  height: 25vh;
  min-width: 360px;
  min-height: 260px;
}

#${MAP_DOM_IDS.modal}[data-window-size="50"] {
  width: 50vw;
  height: 50vh;
  min-width: 520px;
  min-height: 360px;
}

#${MAP_DOM_IDS.modal}[data-window-size="100"] {
  inset: 0;
  top: 0;
  left: 0;
  width: var(--xuantian-map-vw);
  height: var(--xuantian-map-vh);
  transform: none;
  border-color: transparent;
  box-shadow: none;
}

.xuantian-map-shell {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.xuantian-map-stage {
  position: absolute;
  inset: 0;
}

.xuantian-map-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.xuantian-map-topbar {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.xuantian-map-title {
  min-width: 0;
  color: #f6dfb7;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.72);
  white-space: nowrap;
}

.xuantian-map-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.xuantian-map-icon-button {
  width: 38px;
  height: 38px;
  min-width: 38px;
  min-height: 38px;
  border: 1px solid rgba(232, 195, 126, 0.46);
  border-radius: 6px;
  color: #f8e8c8;
  background: rgba(13, 18, 26, 0.72);
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  font-size: 20px;
  line-height: 1;
  white-space: nowrap;
  text-align: center;
  box-sizing: border-box;
}

.xuantian-map-icon-button:hover {
  border-color: rgba(255, 223, 160, 0.86);
  background: rgba(37, 30, 23, 0.82);
}

.xuantian-map-settings {
  position: absolute;
  top: 64px;
  right: 18px;
  width: 220px;
  padding: 12px;
  border: 1px solid rgba(232, 195, 126, 0.32);
  border-radius: 6px;
  background: rgba(8, 12, 18, 0.84);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.xuantian-map-settings[hidden] {
  display: none;
}

.xuantian-map-settings-title {
  color: #f6dfb7;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 10px;
}

.xuantian-map-size-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.xuantian-map-size-button {
  height: 32px;
  border: 1px solid rgba(232, 195, 126, 0.3);
  border-radius: 5px;
  color: #d9c59f;
  background: rgba(21, 28, 38, 0.78);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.xuantian-map-size-button:hover,
.xuantian-map-size-button[aria-pressed="true"] {
  border-color: rgba(255, 223, 160, 0.88);
  color: #fff0ce;
  background: rgba(85, 65, 35, 0.82);
}

.xuantian-map-status {
  position: absolute;
  left: max(18px, env(safe-area-inset-left));
  bottom: max(16px, env(safe-area-inset-bottom));
  max-width: min(520px, calc(100vw - 36px));
  padding: 10px 12px;
  border: 1px solid rgba(232, 195, 126, 0.25);
  border-radius: 6px;
  color: #ead7b3;
  background: rgba(8, 12, 18, 0.66);
  font-size: 13px;
  line-height: 1.5;
  backdrop-filter: blur(10px);
  transition: opacity 240ms ease, transform 240ms ease;
}

.xuantian-map-status[data-kind="error"] {
  border-color: rgba(255, 98, 98, 0.58);
  color: #ffd1d1;
}

.xuantian-map-status[data-kind="hidden"] {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
}

#${MAP_DOM_IDS.fallbackButton} {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 99998;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(232, 195, 126, 0.52);
  border-radius: 6px;
  color: #f6dfb7;
  background: rgba(11, 16, 24, 0.86);
  cursor: pointer;
}

#${MAP_DOM_IDS.floatingButton} {
  position: fixed;
  right: 18px;
  bottom: 86px;
  z-index: 1000000;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(232, 195, 126, 0.68);
  border-radius: 50%;
  color: #f7e5bd;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 235, 175, 0.28), transparent 36%),
    linear-gradient(145deg, rgba(28, 38, 52, 0.96), rgba(8, 12, 20, 0.98));
  cursor: pointer;
  box-shadow: 0 0 16px rgba(232, 195, 126, 0.22), 0 10px 30px rgba(0, 0, 0, 0.45);
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
}

#${MAP_DOM_IDS.floatingButton}:hover {
  border-color: rgba(255, 224, 156, 0.95);
  box-shadow: 0 0 24px rgba(232, 195, 126, 0.36), 0 12px 34px rgba(0, 0, 0, 0.5);
}

@media (max-width: 768px), (pointer: coarse) {
  #${MAP_DOM_IDS.modal} {
    max-width: calc(var(--xuantian-map-vw) - 12px);
    max-height: calc(var(--xuantian-map-vh) - 12px);
  }

  #${MAP_DOM_IDS.modal}[data-window-size="25"] {
    width: min(88vw, calc(var(--xuantian-map-vw) - 16px));
    height: min(42vh, calc(var(--xuantian-map-vh) - 24px));
    min-width: 0;
    min-height: 0;
  }

  #${MAP_DOM_IDS.modal}[data-window-size="50"] {
    width: min(92vw, calc(var(--xuantian-map-vw) - 16px));
    height: min(62vh, calc(var(--xuantian-map-vh) - 24px));
    min-width: 0;
    min-height: 0;
  }

  #${MAP_DOM_IDS.modal}[data-window-size="100"] {
    inset: 0;
    top: 0;
    left: 0;
    width: var(--xuantian-map-vw);
    height: var(--xuantian-map-vh);
    transform: none;
  }

  .xuantian-map-title {
    font-size: 16px;
  }

  .xuantian-map-topbar {
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
    gap: 8px;
  }

  .xuantian-map-actions {
    gap: 6px;
  }

  .xuantian-map-icon-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    font-size: 18px;
  }

  .xuantian-map-status {
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    max-width: none;
    padding: 8px 10px;
    font-size: 12px;
  }

  .xuantian-map-settings {
    top: 56px;
    right: max(10px, env(safe-area-inset-right));
    width: min(220px, calc(100vw - 20px));
    max-height: calc(100dvh - 72px);
    overflow: auto;
  }

  #${MAP_DOM_IDS.floatingButton} {
    right: max(14px, env(safe-area-inset-right));
    bottom: max(74px, env(safe-area-inset-bottom));
    width: 44px;
    height: 44px;
    font-size: 13px;
  }
}

@media (max-height: 520px) and (pointer: coarse) {
  .xuantian-map-status {
    display: none;
  }
}

.xuantian-map-debug-panel {
  position: absolute;
  left: 14px;
  top: 72px;
  z-index: 2;
  width: 238px;
  max-width: calc(100% - 28px);
  padding: 10px;
  border: 1px solid rgba(85, 221, 255, 0.35);
  border-radius: 6px;
  color: #d9f6ff;
  background: rgba(5, 12, 18, 0.84);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
  font-size: 12px;
  line-height: 1.35;
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.xuantian-map-debug-panel[hidden] {
  display: none;
}

.xuantian-map-debug-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
  color: #8ee8ff;
  font-weight: 700;
}

.xuantian-map-debug-panel label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}

.xuantian-map-debug-readout {
  margin-top: 6px;
  color: #b5d9e3;
}
`;

export function injectMapStyles(): () => void {
  const hostDocument = getHostDocument();
  const existing = hostDocument.getElementById(MAP_DOM_IDS.style);
  if (existing) {
    return () => undefined;
  }

  const style = hostDocument.createElement('style');
  style.id = MAP_DOM_IDS.style;
  style.textContent = MAP_STYLE_TEXT;
  hostDocument.head.append(style);

  return () => style.remove();
}
