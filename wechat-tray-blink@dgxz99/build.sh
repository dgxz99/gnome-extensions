#!/usr/bin/env bash
set -euo pipefail

# 所有路径基于脚本位置，避免从其他目录执行时找不到扩展源码
extension_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
out_dir="$(dirname -- "$extension_dir")"

if ! command -v gnome-extensions >/dev/null 2>&1; then
    printf '错误：请先安装提供 gnome-extensions 命令的系统软件包\n' >&2
    exit 1
fi

for file in extension.js metadata.json README.md; do
    if [[ ! -f "$extension_dir/$file" ]]; then
        printf '错误：缺少扩展文件 %s\n' "$extension_dir/$file" >&2
        exit 1
    fi
done

# 在源码目录执行，兼容打包工具对附加文件相对路径的解析
cd -- "$extension_dir"
gnome-extensions pack --force --extra-source=README.md --out-dir="$out_dir" "$extension_dir"
printf '构建完成：%s/wechat-tray-blink@dgxz99.shell-extension.zip\n' "$out_dir"
