// WeChat Tray Blink for GNOME Shell 51
// Watches desktop notifications and blinks the existing AppIndicator tray icon.
// Does not modify WeChat or the AppIndicator extension.
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const WECHAT_RE = /wechat|weixin|微信/i;
const INTERVAL_MS = 450;
const DIM_OPACITY = 0;

export default class WeChatTrayBlinkExtension extends Extension {
    enable() {
        this._sources = new Map();
        this._trayActor = null;
        this._clickId = 0;
        this._originalOpacity = 255;
        this._timerId = 0;
        this._bright = true;

        this._sourceAddedId = Main.messageTray.connect('source-added',
            (_tray, source) => this._watchSource(source));
        this._sourceRemovedId = Main.messageTray.connect('source-removed',
            (_tray, source) => this._unwatchSource(source));

        for (const source of Main.messageTray.getSources())
            this._watchSource(source);

        this._focusId = global.display.connect('notify::focus-window',
            () => this._stopIfFocused());
    }

    _watchSource(source) {
        if (this._sources.has(source))
            return;
        if (!WECHAT_RE.test(String(source.title ?? '')))
            return;

        const id = source.connect('notification-added',
            () => this._notificationReceived());
        this._sources.set(source, id);

        // 锁屏时扩展会被停用，解锁重新启用后补查期间未确认的通知
        if (source.notifications.some(notification => !notification.acknowledged))
            this._notificationReceived();
    }

    _unwatchSource(source) {
        const id = this._sources.get(source);
        if (id !== undefined) {
            try {
                source.disconnect(id);
            } catch (e) {
                // The source may already have been disposed by the Shell.
            }
            this._sources.delete(source);
        }
    }

    _isWechatWindow(window) {
        if (!window)
            return false;
        const values = [
            window.get_wm_class?.(),
            window.get_wm_class_instance?.(),
            window.get_gtk_application_id?.(),
        ];
        return values.some(value => WECHAT_RE.test(String(value ?? '')));
    }

    _stopIfFocused() {
        if (this._isWechatWindow(global.display.focus_window))
            this._stopBlink();
    }

    _findTrayActor() {
        // AppIndicator's IndicatorStatusIcon stores its SNI item in _indicator.
        // This is a private API, so a future AppIndicator update may change it.
        return Object.values(Main.panel.statusArea).find(actor => {
            const item = actor?._indicator;
            if (!item)
                return false;
            return [item.id, item.title, item.accessibleName, actor.accessibleName]
                .some(value => WECHAT_RE.test(String(value ?? '')));
        }) ?? null;
    }

    _notificationReceived() {
        if (this._isWechatWindow(global.display.focus_window))
            return;

        if (this._timerId)
            return;

        this._bright = true;
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, INTERVAL_MS, () => {
            const actor = this._findTrayActor();
            this._attachActor(actor);
            if (actor) {
                try {
                    this._bright = !this._bright;
                    actor.opacity = this._bright ? this._originalOpacity : DIM_OPACITY;
                } catch (e) {
                    console.warn(`[wechat-tray-blink] Could not update tray icon: ${e}`);
                }
            }
            return GLib.SOURCE_CONTINUE;
        });
        console.log('[wechat-tray-blink] WeChat notification detected');
    }

    _attachActor(actor) {
        if (actor === this._trayActor)
            return;
        this._detachActor();
        if (!actor)
            return;
        this._trayActor = actor;
        this._originalOpacity = actor.opacity;
        this._clickId = actor.connect('button-press-event', () => {
            this._stopBlink();
            return false; // Do not consume the click: normal tray action still works.
        });
    }

    _detachActor() {
        if (!this._trayActor)
            return;
        try {
            this._trayActor.opacity = this._originalOpacity;
            if (this._clickId)
                this._trayActor.disconnect(this._clickId);
        } catch (e) {
            // Ignore an actor that AppIndicator destroyed while running.
        }
        this._trayActor = null;
        this._clickId = 0;
    }

    _stopBlink() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
        this._detachActor();
        this._bright = true;
    }

    disable() {
        this._stopBlink();
        if (this._sourceAddedId)
            Main.messageTray.disconnect(this._sourceAddedId);
        if (this._sourceRemovedId)
            Main.messageTray.disconnect(this._sourceRemovedId);
        if (this._focusId)
            global.display.disconnect(this._focusId);

        for (const source of [...this._sources.keys()])
            this._unwatchSource(source);

        this._sources = null;
        this._sourceAddedId = 0;
        this._sourceRemovedId = 0;
        this._focusId = 0;
    }
}
