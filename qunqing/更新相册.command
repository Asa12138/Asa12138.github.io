#!/bin/zsh
set -eu
album_root="${0:A:h}"
python3 "$album_root/manage.py" build
printf '\n相册已更新。按回车关闭窗口。\n'
read
