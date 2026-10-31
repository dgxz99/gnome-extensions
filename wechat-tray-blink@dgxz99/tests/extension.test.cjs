const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../extension.js'), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export default class', 'globalThis.ExtensionUnderTest = class');

function setup(sources = [], focused = false) {
    let nextId = 0;
    const timers = new Map();
    const signals = () => ({
        handlers: new Map(),
        connect(name, callback) {
            const id = ++nextId;
            this.handlers.set(id, {name, callback});
            return id;
        },
        disconnect(id) { this.handlers.delete(id); },
        emit(name, ...args) {
            for (const handler of this.handlers.values()) {
                if (handler.name === name)
                    handler.callback(this, ...args);
            }
        },
    });
    const tray = Object.assign(signals(), {getSources: () => sources});
    const display = Object.assign(signals(), {
        focus_window: focused ? {get_wm_class: () => 'wechat'} : null,
    });
    const actor = Object.assign(signals(), {
        _indicator: {id: 'wechat'}, opacity: 255,
    });
    const context = vm.createContext({
        GLib: {
            PRIORITY_DEFAULT: 0, SOURCE_CONTINUE: true,
            timeout_add(_priority, _interval, callback) {
                const id = ++nextId;
                timers.set(id, callback);
                return id;
            },
            source_remove(id) { timers.delete(id); },
        },
        Main: {messageTray: tray, panel: {statusArea: {wechat: actor}}},
        global: {display}, Extension: class {}, console: {log() {}, warn() {}},
    });
    vm.runInContext(code, context);
    const extension = new context.ExtensionUnderTest();
    const source = (title, notifications) => Object.assign(signals(), {title, notifications});
    return {extension, timers, source, sources, tray, actor, display};
}

test('recovers notifications received while disabled for lock screen', () => {
    const env = setup();
    env.extension.enable();
    env.extension.disable();
    env.sources.push(env.source('WeChat', [{acknowledged: false}]));
    env.extension.enable();
    assert.equal(env.timers.size, 1);
    [...env.timers.values()][0]();
    assert.equal(env.actor.opacity, 0);
    env.extension.disable();
    assert.equal(env.actor.opacity, 255);
    assert.equal(env.timers.size, 0);
    assert.equal(env.sources[0].handlers.size, 0);
});

test('ignores acknowledged, withdrawn and unrelated notifications', () => {
    for (const [title, notifications] of [
        ['WeChat', [{acknowledged: true}]], ['WeChat', []],
        ['Other App', [{acknowledged: false}]],
    ]) {
        const env = setup();
        env.sources.push(env.source(title, notifications));
        env.extension.enable();
        assert.equal(env.timers.size, 0);
        env.extension.disable();
    }
});

test('preserves new notification handling, deduplication and click stop', () => {
    const env = setup();
    env.extension.enable();
    const source = env.source('微信', []);
    env.sources.push(source);
    env.tray.emit('source-added', source);
    source.emit('notification-added');
    source.emit('notification-added');
    assert.equal(env.timers.size, 1);
    [...env.timers.values()][0]();
    env.actor.emit('button-press-event');
    assert.equal(env.timers.size, 0);
    assert.equal(env.actor.opacity, 255);
    env.extension.disable();
});

test('does not resume when WeChat is focused', () => {
    const env = setup([], true);
    env.sources.push(env.source('WeChat', [{acknowledged: false}]));
    env.extension.enable();
    assert.equal(env.timers.size, 0);
    env.extension.disable();
});
