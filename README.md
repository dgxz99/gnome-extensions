# GNOME Extensions

GNOME Shell 扩展集合。

## 扩展

| 扩展 | 功能 | 支持版本 |
| --- | --- | --- |
| [WeChat Tray Blink](./wechat-tray-blink@dgxz99/README.md) | 收到微信桌面通知时闪烁托盘图标，解锁后补查未确认通知 | GNOME Shell 51 |

各扩展的环境要求、使用说明与限制见对应目录中的 README。

## 获取源码

```bash
git clone https://github.com/dgxz99/gnome-extensions.git
cd gnome-extensions
```

## 构建与安装

以 WeChat Tray Blink 为例，需要系统提供 `gnome-extensions` 命令：

```bash
# 构建：ZIP 输出到仓库根目录
bash wechat-tray-blink@dgxz99/build.sh

# 安装到当前用户，不要使用 sudo
gnome-extensions install --force ./wechat-tray-blink@dgxz99.shell-extension.zip
```

安装后保存工作，注销桌面并重新登录，再启用扩展：

```bash
gnome-extensions enable wechat-tray-blink@dgxz99
```

完整步骤见 [WeChat Tray Blink 安装说明](./wechat-tray-blink@dgxz99/README.md#安装)。
