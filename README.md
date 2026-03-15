# ДДС — веб-сервис для управления движением денежных средств

Веб-приложение для учёта поступлений и списаний денежных средств с поддержкой справочников (статусы, типы, категории, подкатегории), фильтрации, экспорта в CSV и аналитики на дашборде.

## Требования

- Python 3.10+
- pip

## Установка зависимостей

```bash
pip install -r requirements.txt
```

Или в виртуальном окружении:

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

## Настройка базы данных

Используется SQLite. Миграции создают таблицы и применяют схему:

```bash
python manage.py migrate
```

## Начальные данные (справочники)

Чтобы загрузить справочники из задания (статусы: Бизнес, Личное, Налог; типы: Пополнение, Списание; категории Инфраструктура и Маркетинг с подкатегориями):

```bash
python manage.py loaddata initial_data.json
```

Файл фикстуры: `cashflow/fixtures/initial_data.json`. В фикстуру включён суперпользователь **admin** (пароль: **admin123**) — после `loaddata` можно сразу входить в приложение и админку.

## Запуск веб-сервиса

```bash
python manage.py runserver
```

Откройте в браузере: **http://127.0.0.1:8000/** — при первом заходе откроется страница входа. Если загружали фикстуру `initial_data.json`, используйте логин **admin** и пароль **admin123**. Иначе создайте пользователя: `python manage.py createsuperuser`.

После входа доступны:

- **Главная** — таблица записей ДДС, фильтры, сводки и графики.
- **Новая запись** — создание/редактирование записи с каскадным выбором категории и подкатегории.
- **Справочники** — управление статусами, типами, категориями и подкатегориями.

## Переменные окружения (продакшен)

- `DJANGO_SECRET_KEY` — секретный ключ (обязательно сменить в продакшене).
- `DJANGO_DEBUG` — `False` для отключения режима отладки.
- `DJANGO_ALLOWED_HOSTS` — список хостов через запятую (например, `example.com,www.example.com`).

## API

REST API доступен по префиксу `/api/`. Для доступа требуется аутентификация (сессия после входа в веб-интерфейс):

- `GET/POST /api/records/` — список записей (с фильтрами), создание.
- `GET/PUT/PATCH/DELETE /api/records/<id>/` — одна запись.
- `GET /api/records/export/?date_from=...&date_to=...` — экспорт в CSV.
- `GET /api/dashboard/summary/?date_from=...&date_to=...` — сводка для дашборда.
- `GET/POST /api/statuses/`, `/api/types/`, `/api/categories/`, `/api/subcategories/` — справочники (CRUD).
- Категории: `GET /api/categories/?type_id=<id>`.
- Подкатегории: `GET /api/subcategories/?category_id=<id>`.

## Структура проекта

```
├── manage.py
├── requirements.txt
├── dds_project/          # настройки Django
├── cashflow/              # приложение ДДС
│   ├── models.py          # Status, Type, Category, Subcategory, CashFlowRecord
│   ├── api/               # DRF сериализаторы и ViewSets
│   ├── filters.py         # фильтрация записей
│   ├── fixtures/          # начальные данные
│   └── templates/cashflow/
└── static/                # CSS, JS
```

## Тесты

```bash
python manage.py test cashflow
```

## Демо и скриншоты

После запуска сервера интерфейс доступен по адресу http://127.0.0.1:8000/. Рекомендуется сначала загрузить фикстуру `initial_data.json`, затем создать несколько записей через «Новая запись» и просмотреть дашборд с графиками и экспортом CSV.
