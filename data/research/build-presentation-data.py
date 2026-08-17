# -*- coding: utf-8 -*-
"""Пересобирает presentation-data.js из JSON-файлов.

Нужен, чтобы страница открывалась двойным кликом (протокол file://), где fetch недоступен.
Запускать после любой правки данных в этой папке:

    python data/research/build-presentation-data.py
"""
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent
# имя файла -> ключ, под которым его ждёт компонент
DATASETS = {
    'matrices': 'matrices',
    'organizations': 'organizations',
    'sources': 'sources',
    'claims': 'claims',
    'partnerships': 'partnerships',
    'rosters': 'rosters',
    'media-events': 'mediaEvents',
    'streamer-stats': 'streamerStats',
    'streamer-background': 'streamerBackground',
}

bundle = {}
for name, key in DATASETS.items():
    path = BASE / f'{name}.json'
    if not path.exists():
        raise SystemExit(f'нет файла: {path}')
    bundle[key] = json.loads(path.read_text(encoding='utf-8'))

payload = json.dumps(bundle, ensure_ascii=False, separators=(',', ':'))
out = BASE / 'presentation-data.js'
out.write_text(f'window.WINLINE_RESEARCH_DATA={payload};\n', encoding='utf-8')

print(f'записан {out.name} — {len(payload):,} символов'.replace(',', ' '))
for name, key in DATASETS.items():
    doc = bundle[key]
    size = len(doc.get(next((k for k in doc if isinstance(doc.get(k), list)), ''), [])) if isinstance(doc, dict) else 0
    print(f'  {name:16} записей: {size}')
