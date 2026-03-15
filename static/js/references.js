(function () {
  const API = '/api';
  const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const refConfig = {
    status: { url: 'statuses', tbody: 'ref-status-tbody', cols: ['id', 'name'], title: 'Статус', extra: [] },
    type: { url: 'types', tbody: 'ref-type-tbody', cols: ['id', 'name'], title: 'Тип', extra: [] },
    category: { url: 'categories', tbody: 'ref-category-tbody', cols: ['id', 'name', 'type'], title: 'Категория', extra: ['type'] },
    subcategory: { url: 'subcategories', tbody: 'ref-subcategory-tbody', cols: ['id', 'name', 'category'], title: 'Подкатегория', extra: ['category'] },
  };

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    const t = String(s);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return t.replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-bg-' + type + ' border-0 show';
    toast.setAttribute('role', 'alert');
    const body = document.createElement('div');
    body.className = 'd-flex';
    const bodyInner = document.createElement('div');
    bodyInner.className = 'toast-body';
    bodyInner.textContent = message;
    body.appendChild(bodyInner);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
    closeBtn.setAttribute('data-bs-dismiss', 'toast');
    body.appendChild(closeBtn);
    toast.appendChild(body);
    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }

  let types = [];
  let categories = [];

  function loadTypes() {
    return fetch(API + '/types/').then((r) => r.json()).then((data) => { types = data.results || data || []; return types; });
  }
  function loadCategories() {
    return fetch(API + '/categories/').then((r) => r.json()).then((data) => { categories = data.results || data || []; return categories; });
  }

  function renderRow(kind, item) {
    const c = refConfig[kind];
    if (!c) return '';
    const name = escapeHtml(item.name);
    let extra = '';
    if (kind === 'category') {
      extra = escapeHtml(item.type_name || (typeof item.type === 'object' ? item.type && item.type.name : (types.find((t) => t.id === item.type) || {}).name) || '—');
    }
    if (kind === 'subcategory') {
      extra = escapeHtml(item.category_name || (typeof item.category === 'object' ? item.category && item.category.name : (categories.find((cat) => cat.id === item.category) || {}).name) || '—');
    }
    return (
      '<tr><td>' + item.id + '</td><td>' + name + '</td>' +
      (c.extra.length ? '<td>' + extra + '</td>' : '') +
      '<td><button type="button" class="btn btn-sm btn-outline-primary edit-ref" data-kind="' + kind + '" data-id="' + item.id + '">Изм.</button> ' +
      '<button type="button" class="btn btn-sm btn-outline-danger delete-ref" data-kind="' + kind + '" data-id="' + item.id + '">Удалить</button></td></tr>'
    );
  }

  function loadRef(kind) {
    const c = refConfig[kind];
    if (!c) return;
    const tbody = document.getElementById(c.tbody);
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Загрузка…</td></tr>';
    const url = API + '/' + c.url + '/';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Нет записей.</td></tr>';
          return;
        }
        tbody.innerHTML = list.map((item) => renderRow(kind, item)).join('');
        tbody.querySelectorAll('.edit-ref').forEach((btn) => {
          btn.addEventListener('click', () => openModal(kind, btn.getAttribute('data-id')));
        });
        tbody.querySelectorAll('.delete-ref').forEach((btn) => {
          btn.addEventListener('click', () => confirmDelete(kind, btn.getAttribute('data-id')));
        });
      })
      .catch(() => {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Ошибка загрузки.</td></tr>';
      });
  }

  function openModal(kind, id) {
    const c = refConfig[kind];
    document.getElementById('modal-ref-id').value = id || '';
    document.getElementById('modal-ref-kind').value = kind;
    document.getElementById('modal-ref-title').textContent = id ? 'Редактировать' : 'Добавить';
    document.getElementById('modal-ref-name').value = '';
    document.getElementById('wrap-ref-type').classList.add('d-none');
    document.getElementById('wrap-ref-category').classList.add('d-none');
    if (kind === 'category') {
      document.getElementById('wrap-ref-type').classList.remove('d-none');
      const sel = document.getElementById('modal-ref-type');
      sel.innerHTML = '<option value="">Выберите тип</option>';
      types.forEach((t) => { const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; sel.appendChild(o); });
      sel.value = '';
    }
    if (kind === 'subcategory') {
      document.getElementById('wrap-ref-category').classList.remove('d-none');
      const sel = document.getElementById('modal-ref-category');
      sel.innerHTML = '<option value="">Выберите категорию</option>';
      categories.forEach((cat) => { const o = document.createElement('option'); o.value = cat.id; o.textContent = cat.name; sel.appendChild(o); });
      sel.value = '';
    }
    if (id) {
      fetch(API + '/' + c.url + '/' + id + '/')
        .then((r) => r.json())
        .then((item) => {
          document.getElementById('modal-ref-name').value = item.name;
          if (kind === 'category' && item.type) document.getElementById('modal-ref-type').value = typeof item.type === 'object' ? item.type.id : item.type;
          if (kind === 'subcategory' && item.category) document.getElementById('modal-ref-category').value = typeof item.category === 'object' ? item.category.id : item.category;
        });
    }
    new bootstrap.Modal(document.getElementById('modal-ref-edit')).show();
  }

  function saveRef() {
    const kind = document.getElementById('modal-ref-kind').value;
    const id = document.getElementById('modal-ref-id').value;
    const name = document.getElementById('modal-ref-name').value.trim();
    const c = refConfig[kind];
    if (!name) { showToast('Введите название', 'danger'); return; }
    const payload = { name };
    if (kind === 'category') {
      const typeId = document.getElementById('modal-ref-type').value;
      if (!typeId) { showToast('Выберите тип', 'danger'); return; }
      payload.type = parseInt(typeId, 10);
    }
    if (kind === 'subcategory') {
      const catId = document.getElementById('modal-ref-category').value;
      if (!catId) { showToast('Выберите категорию', 'danger'); return; }
      payload.category = parseInt(catId, 10);
    }
    const url = id ? API + '/' + c.url + '/' + id + '/' : API + '/' + c.url + '/';
    const method = id ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (r.ok) {
          showToast('Сохранено', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modal-ref-edit')).hide();
          loadRef(kind);
          if (kind === 'category') loadCategories();
        } else return r.json().then((err) => { throw err; });
      })
      .catch((err) => showToast(err.detail || err.name || 'Ошибка', 'danger'));
  }

  let deleteKind = null;
  let deleteId = null;

  function confirmDelete(kind, id) {
    deleteKind = kind;
    deleteId = id;
    const body = document.getElementById('modal-ref-delete-body');
    body.textContent = 'Элемент будет удалён. Если он используется в записях ДДС, удаление может быть запрещено или приведёт к потере связей.';
    new bootstrap.Modal(document.getElementById('modal-ref-delete')).show();
  }

  document.getElementById('btn-modal-ref-save').addEventListener('click', saveRef);

  document.getElementById('btn-modal-ref-delete-confirm').addEventListener('click', () => {
    if (!deleteKind || !deleteId) return;
    const c = refConfig[deleteKind];
    fetch(API + '/' + c.url + '/' + deleteId + '/', {
      method: 'DELETE',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin',
    })
      .then((r) => {
        if (r.ok) {
          showToast('Удалено', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modal-ref-delete')).hide();
          loadRef(deleteKind);
          if (deleteKind === 'category') loadCategories();
        } else {
          return r.json().then((err) => { throw err; });
        }
      })
      .catch((err) => {
        showToast(err.detail || (err.category && err.category[0]) || 'Нельзя удалить: элемент используется.', 'danger');
      });
    deleteKind = null;
    deleteId = null;
  });

  document.querySelectorAll('[data-ref]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-ref'), null));
  });

  Promise.all([loadTypes(), loadCategories()]).then(() => {
    loadRef('status');
    loadRef('type');
    loadRef('category');
    loadRef('subcategory');
  });
})();
