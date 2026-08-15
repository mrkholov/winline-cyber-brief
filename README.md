# Winline Cyber Brief

Статический сайт-презентация с данными по киберспортивным трансляциям.

## Структура

- `legacy/*.html` — предыдущая версия презентации
- `assets/` — общие стили
- `scripts/` — скрипты сбора и обработки данных
- `data/raw/` — исходные снимки данных
- `data/processed/` — обработанные данные
- `data/research/` — нормализованные источники, claims и матрицы
- `Docs/` — материалы по вакансии, интервью и кандидату
- `Docs/research/` — цифры, исследования и аудит источников

Основной индекс материалов: [Docs/README.md](Docs/README.md).

## Локальный запуск

```bash
npx --yes http-server . -p 8000
```

Сайт будет доступен по адресу `http://localhost:8000`.

## Обновление данных

Требуется Node.js 18 или новее.

```bash
node scripts/fetch-panels.js
```

Скрипт читает `data/raw/snapshot.json` и обновляет файлы в `data/processed/`.

Исследовательский пакет собирается и проверяется отдельно:

```bash
node scripts/build-research-data.js
node scripts/build-market-research.js
node scripts/build-research-matrices.js
node scripts/validate-research-data.js
```
