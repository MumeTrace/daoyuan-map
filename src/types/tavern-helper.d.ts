type TavernScriptButton = {
  name: string;
  visible: boolean;
};

type TavernEventStopper = {
  stop: () => void;
};

type JQueryReady = {
  (callback: () => void): void;
  (target: Window): {
    on: (eventName: string, listener: () => void) => void;
    off: (eventName: string, listener: () => void) => void;
  };
};

declare const $: JQueryReady | undefined;
declare function appendInexistentScriptButtons(buttons: TavernScriptButton[]): void;
declare function getButtonEvent(buttonName: string): string;
declare function eventOn(eventType: string, listener: () => void): TavernEventStopper | void;
declare function replaceScriptButtons(buttons: TavernScriptButton[]): void;
declare function updateScriptButtonsWith(
  updater: (buttons: TavernScriptButton[]) => TavernScriptButton[],
): TavernScriptButton[];
declare function replaceScriptInfo(info: string): void;
