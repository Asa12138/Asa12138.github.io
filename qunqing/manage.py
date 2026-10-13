#!/usr/bin/env python3
"""Manage travel albums from ../images/<trip>/trip*.json + story*.md.
Standard-library only. Original photos are never changed.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
IMAGES = SITE / 'images'
SUFFIXES = {'.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif'}


def natural_key(path):
    return [int(s) if s.isdigit() else s.lower() for s in re.split(r'(\d+)', path.name)]


def safe_file(folder, name):
    path = (folder / name).resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError(f'文件必须位于旅程目录内：{name}')
    if not path.is_file():
        raise ValueError(f'文件不存在：{path}')
    return path


def url_for(path):
    return '../' + path.relative_to(SITE).as_posix()


def inline_markdown(text):
    # Keep arbitrary HTML/scripts inert. Support a small, documented subset of
    # Markdown suitable for travel prose without adding a runtime dependency.
    value = html.escape(text)
    value = re.sub(r'`([^`]+)`', r'<code>\1</code>', value)
    value = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', value)
    value = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', value)
    return value


def render_story(text):
    blocks, paragraph, items = [], [], []
    def flush_paragraph():
        if paragraph:
            blocks.append('<p>' + '<br>'.join(inline_markdown(v) for v in paragraph) + '</p>')
            paragraph.clear()
    def flush_items():
        if items:
            blocks.append('<ul>' + ''.join('<li>' + inline_markdown(v) + '</li>' for v in items) + '</ul>')
            items.clear()
    for line in text.splitlines():
        line = line.strip()
        if not line:
            flush_paragraph(); flush_items()
        elif re.match(r'^#{1,6}\s', line):
            flush_paragraph(); flush_items()
            blocks.append('<h3>' + inline_markdown(re.sub(r'^#{1,6}\s+', '', line)) + '</h3>')
        elif re.match(r'^[-*]\s+', line):
            flush_paragraph()
            items.append(re.sub(r'^[-*]\s+', '', line))
        else:
            flush_items(); paragraph.append(line)
    flush_paragraph(); flush_items()
    notes = [re.sub(r'(?m)^#{1,6}\s+|^[-*]\s+', '', p).strip() for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    return '\n'.join(blocks), notes


def normal_date(value):
    match = re.search(r'(20\d{2})[./-](\d{1,2})[./-](\d{1,2})', value)
    if not match:
        raise ValueError(f'请填写真实日期（YYYY-MM-DD）：{value!r}')
    return date(*map(int, match.groups())).isoformat()


def read_albums():
    records, ids, keys = [], set(), set()
    for folder in sorted(IMAGES.iterdir()):
        if not folder.is_dir() or folder.name == 'atlas-thumbs':
            continue
        for config in sorted(folder.glob('trip*.json')):
            meta = json.loads(config.read_text(encoding='utf-8'))
            if meta.get('draft', False):
                continue
            title = str(meta.get('title', '')).strip()
            if not title:
                raise ValueError(f'{config}: title 不能为空')
            key = meta.get('key', folder.name)
            album_id = meta.get('id', key)
            if album_id in ids or key in keys:
                raise ValueError(f'{config}: 重复的 id / key')
            if not all(isinstance(v, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', v) for v in (album_id, key)):
                raise ValueError(f'{config}: id / key 只能包含英文、数字、下划线、点与短横线')
            ids.add(album_id); keys.add(key)
            start_date = normal_date(meta.get('date') or meta.get('startDate', ''))
            story_name = meta.get('story', 'story.md')
            story_path = (folder / story_name).resolve()
            if not story_path.is_relative_to(folder.resolve()):
                raise ValueError(f'{config}: story 必须位于旅程目录内')
            story_html, notes = render_story(story_path.read_text(encoding='utf-8') if story_path.is_file() else '')
            entries = meta.get('photos')
            if entries is None:
                entries = [p.name for p in sorted(folder.iterdir(), key=natural_key) if p.is_file() and p.suffix.lower() in SUFFIXES]
            photos = []
            for entry in entries:
                entry = {'file': entry} if isinstance(entry, str) else entry
                source = safe_file(folder, entry['file'])
                if source.suffix.lower() not in SUFFIXES:
                    raise ValueError(f'{config}: 不支持的照片格式 {source.name}')
                photos.append({'src': url_for(source), 'chapter': entry.get('chapter', ''), **({'caption': entry['caption']} if entry.get('caption') else {}), **({'date': normal_date(entry['date'])} if entry.get('date') else {})})
            if not photos:
                print(f'跳过空相册：{folder.name}（放入照片后重新构建）')
                continue
            if len({p['src'] for p in photos}) != len(photos):
                raise ValueError(f'{config}: photos 中存在重复照片')
            cover = url_for(safe_file(folder, meta['cover'])) if meta.get('cover') else photos[0]['src']
            companions = meta.get('companions', 'together')
            if companions not in ('solo', 'together'):
                raise ValueError(f'{config}: companions 只能是 solo / together')
            places = meta.get('places', [])
            route = meta.get('route', [])
            for place in places + route:
                coords = place.get('coords', [])
                if len(coords) != 2 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in coords) or not (-180 <= coords[0] <= 180 and -85 <= coords[1] <= 85):
                    raise ValueError(f'{config}: coords 必须为有效的 [经度, 纬度]')
                if not place.get('name') or not isinstance(place.get('id'), str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', place['id']):
                    raise ValueError(f'{config}: 地点必须填写英文 id 与实际 name')
                if 'star' in place and (not isinstance(place['star'], list) or len(place['star']) != 2 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= 100 for v in place['star'])):
                    raise ValueError(f'{config}: star 必须为两个 0–100 的排版位置数值')
                if place in places and place.get('scope', 'china') not in ('china', 'overseas'):
                    raise ValueError(f'{config}: scope 只能是 china / overseas')
            records.append({
                'id': album_id, 'key': key, 'folder': folder.name, 'year': start_date[:4],
                'title': meta.get('originalTitle', title), 'originalTitle': meta.get('originalTitle', title),
                'name': title, 'date': meta.get('date') or start_date, 'startDate': start_date,
                'location': meta.get('location', '地点待补充'), 'category': meta.get('category', '旅程'), 'companions': companions,
                'summary': meta.get('summary') or (notes[0] if notes else ''),
                'notes': notes, 'storyHtml': story_html, 'storySource': url_for(story_path),
                'photos': photos, 'cover': cover, 'places': places, 'route': route,
            })
    # One city can appear in multiple journeys; its identity and anchor must agree.
    anchors = {}
    for record in records:
        for place in record['places']:
            anchor = (place['name'], tuple(place['coords']), place.get('scope', 'china'))
            if place['id'] in anchors and anchors[place['id']] != anchor:
                raise ValueError(f'地点 id {place["id"]} 的名称 / 坐标不一致，请统一或使用不同 id')
            anchors[place['id']] = anchor
    return sorted(records, key=lambda a: a['startDate'], reverse=True)


def thumbnail(source):
    relative = source.relative_to(IMAGES)
    # Include the original extension so 1.jpg and 1.webp cannot overwrite each other.
    target = IMAGES / 'atlas-thumbs' / relative.parent / (source.name + '.jpg')
    legacy = IMAGES / 'atlas-thumbs' / relative.with_suffix('.jpg')
    same_stem = [p for p in source.parent.iterdir() if p.is_file() and p.suffix.lower() in SUFFIXES and p.stem == source.stem]
    if legacy.exists() and len(same_stem) == 1:
        target = legacy  # Reuse the existing previews instead of copying them again.
    if shutil.which('sips'):
        if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
            target.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '-Z', '720', str(source), '--out', str(target)], check=True, stdout=subprocess.DEVNULL)
    elif not target.exists():
        return source
    return target


def build(skip_thumbnails=False):
    albums = read_albums()
    if not albums:
        raise ValueError('没有可用相册。请先使用 new 命令建立旅程并放入照片。')
    sources = {safe_file(SITE, p['src'][3:]) for a in albums for p in a['photos']}
    sources.update(safe_file(SITE, a['cover'][3:]) for a in albums)
    with ThreadPoolExecutor(max_workers=4) as pool:
        previews = dict(zip(sorted(sources), pool.map(lambda p: p if skip_thumbnails else thumbnail(p), sorted(sources))))
    for album in albums:
        for photo in album['photos']:
            photo['thumb'] = url_for(previews[safe_file(SITE, photo['src'][3:])])
        album['coverThumb'] = url_for(previews[safe_file(SITE, album['cover'][3:])])
    # Escape '<' so story prose cannot terminate a script if later embedded inline.
    encoded = json.dumps(albums, ensure_ascii=False, indent=2).replace('<', '\\u003c')
    output = ROOT / 'qunqing-v3-data.js'
    temporary = output.with_suffix('.js.tmp')
    temporary.write_text('// Generated by manage.py from images/*/trip*.json and story*.md.\nwindow.TRAVEL_ATLAS_DATA = ' + encoded + ';\n', encoding='utf-8')
    temporary.replace(output)
    # index.html is the directory entry; the versioned URL remains an alias.
    shutil.copyfile(ROOT / 'qunqing-v3.html', ROOT / 'index.html')
    exclusions = ['/qunqing/', '/qunqing.html', '/images/atlas-thumbs/']
    exclusions += [f'/images/{folder.name}/' for folder in sorted(IMAGES.iterdir()) if folder.is_dir() and any(folder.glob('trip*.json'))]
    (ROOT / 'album-rsync-excludes.txt').write_text('\n'.join(exclusions) + '\n', encoding='utf-8')
    print(f'已构建：{len(albums)} 本相册 / {sum(len(a["photos"]) for a in albums)} 张照片。入口：qunqing/index.html')


def new_trip(args):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', args.folder):
        raise ValueError('文件夹名请使用字母、数字、下划线或短横线，如 2610hangzhou')
    if bool(args.longitude is not None) != bool(args.latitude is not None):
        raise ValueError('longitude 和 latitude 必须一起填写')
    if args.longitude is not None and not (-180 <= args.longitude <= 180 and -85 <= args.latitude <= 85):
        raise ValueError('请输入有效的经度与纬度')
    if args.longitude is not None and args.location == '地点待补充':
        raise ValueError('填写坐标时也请使用 --location 填写实际地点名称')
    start_date = normal_date(args.date)
    folder = IMAGES / args.folder
    if any(folder.glob('trip*.json')):
        raise ValueError(f'旅程配置已存在，不会覆盖：{folder}')
    folder.mkdir(parents=True, exist_ok=True)
    places = []
    # Reuse a city explicitly named by the user; never geolocate photos by guesswork.
    known = next((p for a in read_albums() for p in a['places'] if p['name'] == args.location), None)
    if args.longitude is not None:
        if args.location == '地点待补充':
            raise ValueError('填写坐标时也请使用 --location 填写实际地点名称')
        digest = hashlib.sha256((args.location + str(args.longitude) + str(args.latitude)).encode()).hexdigest()[:10]
        places = [{'id': 'place-' + digest, 'name': args.location, 'coords': [args.longitude, args.latitude], 'scope': args.scope}]
    elif known:
        places = [known]
    meta = {'id': args.folder, 'key': args.folder, 'title': args.title,
            'date': start_date, 'location': args.location, 'category': args.category,
            'story': 'story.md', 'companions': args.companions, 'places': places}
    (folder / 'trip.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    story = folder / 'story.md'
    if not story.exists():
        story.write_text('', encoding='utf-8')
    print(f'旅程目录已建立：{folder}\n放入照片，填写 story.md，然后运行 manage.py build。')
    if not places:
        print('未填写地图坐标：相册会显示，地图暂不加图钉。可在 trip.json 的 places 中补充。')


def main(argv=None):
    parser = argparse.ArgumentParser(description='群青相册管理：照片与文案在同一旅程目录，不依赖 Quarto。')
    commands = parser.add_subparsers(dest='command', required=True)
    compile_command = commands.add_parser('build', help='读取旅程目录并更新网页数据、缩略图与目录入口')
    compile_command.add_argument('--skip-thumbnails', action='store_true', help='本次不生成缩略图，使用原图')
    create = commands.add_parser('new', help='在已有照片目录中补充配置，或建立新旅程目录')
    create.add_argument('folder')
    create.add_argument('--title', required=True)
    create.add_argument('--date', required=True, help='真实出发日期 YYYY-MM-DD')
    create.add_argument('--location', default='地点待补充')
    create.add_argument('--category', default='旅程')
    create.add_argument('--companions', choices=['solo', 'together'], default='together', help='solo 独自出发 / together 与群青同行')
    create.add_argument('--longitude', type=float)
    create.add_argument('--latitude', type=float)
    create.add_argument('--scope', choices=['china', 'overseas'], default='china')
    args = parser.parse_args(argv)
    try:
        build(args.skip_thumbnails) if args.command == 'build' else new_trip(args)
    except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'相册未更新：{error}\n')


if __name__ == '__main__':
    main()
