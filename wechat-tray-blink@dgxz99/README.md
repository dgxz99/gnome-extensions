# WeChat Tray Blink

收到微信桌面通知时，让 AppIndicator 中的微信托盘图标闪烁。

## 环境要求

- GNOME Shell 51
- 已安装并启用 AppIndicator 扩展，微信托盘图标正常显示
- 微信 Linux 客户端已开启桌面通知
- 安装与打包命令需要系统提供 `gnome-extensions` 工具

## 安装

### 1. 获取源码

```bash
git clone https://github.com/dgxz99/gnome-extensions.git
cd gnome-extensions
```

### 2. 构建

```bash
bash wechat-tray-blink@dgxz99/build.sh
```

脚本使用 `gnome-extensions pack` 打包，在仓库根目录生成 `wechat-tray-blink@dgxz99.shell-extension.zip`。ZIP 已通过根目录的 `.gitignore` 忽略，不纳入源码版本管理。

构建脚本根据自身位置解析路径，也可以从其他目录通过绝对路径调用；它只构建，不安装或启用扩展。

### 3. 安装

```bash
gnome-extensions install --force ./wechat-tray-blink@dgxz99.shell-extension.zip
```

安装到当前用户的 GNOME 扩展目录。`--force` 允许覆盖同 UUID 的已安装版本。请以桌面会话用户执行，不要使用 `sudo`。

### 4. 重新登录并启用

首次安装，或更新已加载的扩展代码后，建议注销当前桌面会话并重新登录，以确保 Shell 加载新代码。请先保存工作；锁屏再解锁不等同于注销登录。Wayland 下不要使用 `Alt+F2` 后输入 `r` 的方式重启 Shell。

重新登录后执行：

```bash
gnome-extensions enable wechat-tray-blink@dgxz99
gnome-extensions info wechat-tray-blink@dgxz99
```

同时确认 AppIndicator 已启用，且微信托盘图标可见。

后续更新时，在仓库根目录执行 `git pull`，再重复构建、安装和重新登录步骤。

## 使用与验证

### 普通通知

微信窗口未获得焦点时，执行以下命令模拟通知（需要系统提供 `notify-send`）：

```bash
notify-send -a WeChat -i wechat '模拟微信消息' '测试托盘图标闪烁'
```

预期行为：

1. 微信托盘图标以约 450 毫秒的间隔交替隐藏和显示
2. 点击微信托盘图标，或者切换到微信窗口，停止闪烁
3. 停止闪烁或禁用扩展后，恢复图标原有透明度

模拟通知只能验证桌面通知触发链路，不能代替真实微信消息测试。

### 锁屏恢复

1. 将焦点切换到非微信窗口，然后锁屏
2. 从其他设备向此微信账号发送消息，确保桌面客户端收到通知
3. 不在手机上阅读消息，解锁进入桌面
4. 如果 GNOME 中仍保留未确认的微信通知，扩展重新启用时应恢复闪烁
5. 点击托盘图标或进入微信窗口，确认闪烁停止

## 工作机制与限制

- 监听 GNOME 的微信通知源，不修改微信客户端或 AppIndicator 扩展
- 启用时补查已有的未确认微信通知，用于恢复锁屏期间遗漏的通知提醒
- GNOME 的通知确认状态不等于微信消息的已读状态；扩展无法查询微信未读数量或手机端已读回执
- 手机已读后是否仍恢复闪烁，取决于微信是否同步撤回桌面通知，以及 GNOME 的通知确认状态
- 运行中的闪烁主要通过点击托盘或微信窗口获得焦点停止，不保证随手机已读状态实时停止
- 如果微信未发送桌面通知，或者通知已被清除，则无法通过此扩展恢复提醒
- 使用 AppIndicator 的内部属性 `_indicator` 定位图标，AppIndicator 更新后可能需要适配

## 禁用与卸载

```bash
gnome-extensions disable wechat-tray-blink@dgxz99
gnome-extensions uninstall wechat-tray-blink@dgxz99
```

## 开发验证

在仓库根目录执行，需要 Node.js：

```bash
node --test wechat-tray-blink@dgxz99/tests/extension.test.cjs
node --input-type=module --check < wechat-tray-blink@dgxz99/extension.js
bash -n wechat-tray-blink@dgxz99/build.sh
```

自动化测试使用模拟的 GNOME 环境；真实微信通知与锁屏恢复效果仍需在桌面会话中验证。
