(function () {
  const API = '/api';
  const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    const t = String(s);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return t.replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
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

  function formatAmount(amount, typeName) {
    const n = Number(amount);
    const s = n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
    return s;
  }

  function formatDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('ru-RU');
  }

  let chartCategories = null;
  let chartDates = null;
  let currentPage = 1;
  let deleteTargetId = null;
  let allCategories = [];
  let allSubcategories = [];

  function buildParams() {
    const p = new URLSearchParams();
    p.set('page', currentPage);
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const status = document.getElementById('filter-status').value;
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    const subcategory = document.getElementById('filter-subcategory').value;
    if (dateFrom) p.set('date_from', dateFrom);
    if (dateTo) p.set('date_to', dateTo);
    if (status) p.set('status', status);
    if (type) p.set('type', type);
    if (category) p.set('category', category);
    if (subcategory) p.set('subcategory', subcategory);
    return p;
  }

  function fillSelect(id, list, firstOption) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = firstOption || '<option value="">Все</option>';
    (list || []).forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      el.appendChild(opt);
    });
  }

  function updateCategoryFilterByType() {
    const typeId = document.getElementById('filter-type').value;
    const categories = typeId
      ? allCategories.filter((c) => String(c.type) === String(typeId))
      : allCategories;
    fillSelect('filter-category', categories, '<option value="">Все</option>');
    document.getElementById('filter-category').value = '';
    updateSubcategoryFilterByCategory();
  }

  function updateSubcategoryFilterByCategory() {
    const categoryId = document.getElementById('filter-category').value;
    const subcategories = categoryId
      ? allSubcategories.filter((s) => String(s.category) === String(categoryId))
      : allSubcategories;
    fillSelect('filter-subcategory', subcategories, '<option value="">Все</option>');
    document.getElementById('filter-subcategory').value = '';
  }

  function loadRefs() {
    return Promise.all([
      fetch(API + '/statuses/').then(r => r.json()).then(d => d.results || d || []),
      fetch(API + '/types/').then(r => r.json()).then(d => d.results || d || []),
      fetch(API + '/categories/').then(r => r.json()).then(d => d.results || d || []),
      fetch(API + '/subcategories/').then(r => r.json()).then(d => d.results || d || []),
    ]).then(([statuses, types, categories, subcategories]) => {
      allCategories = categories || [];
      allSubcategories = subcategories || [];
      fillSelect('filter-status', statuses, '<option value="">Все</option>');
      fillSelect('filter-type', types, '<option value="">Все</option>');
      fillSelect('filter-category', allCategories, '<option value="">Все</option>');
      fillSelect('filter-subcategory', allSubcategories, '<option value="">Все</option>');
      return { statuses, types, categories: allCategories, subcategories: allSubcategories };
    });
  }

  function loadSummary() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const q = new URLSearchParams();
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);
    return fetch(API + '/dashboard/summary/?' + q).then(r => r.json()).then((data) => {
      document.getElementById('summary-balance').textContent = data.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽';
      document.getElementById('summary-income').textContent = data.income_total.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽';
      document.getElementById('summary-expense').textContent = data.expense_total.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽';

      const ctxCat = document.getElementById('chart-categories');
      if (ctxCat && data.by_category && data.by_category.length) {
        if (chartCategories) chartCategories.destroy();
        chartCategories = new Chart(ctxCat, {
          type: 'doughnut',
          data: {
            labels: data.by_category.map(c => c.category__name || '—'),
            datasets: [{ data: data.by_category.map(c => c.total), backgroundColor: ['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#20c997', '#ffc107', '#dc3545', '#0dcaf0'] }],
          },
          options: { responsive: true, maintainAspectRatio: true },
        });
      }

      const ctxDate = document.getElementById('chart-dates');
      if (ctxDate && data.by_date && data.by_date.length) {
        if (chartDates) chartDates.destroy();
        chartDates = new Chart(ctxDate, {
          type: 'line',
          data: {
            labels: data.by_date.map(d => d.date),
            datasets: [{ label: 'Сумма', data: data.by_date.map(d => d.total), borderColor: '#0d6efd', fill: false }],
          },
          options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } } },
        });
      }
    });
  }

  function loadRecords() {
    const params = buildParams();
    const tbody = document.getElementById('records-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Загрузка…</td></tr>';

    fetch(API + '/records/?' + params)
      .then(r => r.json())
      .then((data) => {
        const results = data.results || data;
        const count = data.count !== undefined ? data.count : results.length;
        const next = data.next;
        const prev = data.previous;

        if (!results.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Нет записей. Добавьте первую или измените фильтры.</td></tr>';
        } else {
          tbody.innerHTML = results.map((r) => {
            const amountClass = (r.type_name || '').toLowerCase().indexOf('пополн') >= 0 ? 'text-success' : 'text-danger';
            const comment = r.comment || '';
            const commentShort = comment ? (comment.slice(0, 50) + (comment.length > 50 ? '…' : '')) : '—';
            return (
              '<tr><td>' + escapeHtml(formatDate(r.date)) + '</td><td>' + escapeHtml(r.status_name || '—') +
              '</td><td>' + escapeHtml(r.type_name || '—') + '</td><td>' + escapeHtml(r.category_name || '—') +
              '</td><td>' + escapeHtml(r.subcategory_name || '—') + '</td><td class="text-end ' + amountClass + '">' +
              escapeHtml(formatAmount(r.amount, r.type_name)) + '</td><td class="text-truncate" style="max-width:180px" title="' +
              escapeHtml(comment) + '">' + escapeHtml(commentShort) + '</td><td>' +
              '<a href="/record/' + r.id + '/edit/" class="btn btn-sm btn-outline-primary">Изм.</a> ' +
              '<button type="button" class="btn btn-sm btn-outline-danger ms-1" data-id="' + r.id + '">Удалить</button></td></tr>'
            );
          }).join('');
        }

        tbody.querySelectorAll('button[data-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            deleteTargetId = btn.getAttribute('data-id');
            new bootstrap.Modal(document.getElementById('modal-delete')).show();
          });
        });

        const pagWrap = document.getElementById('pagination-wrap');
        if (next || prev || count > (results.length)) {
          let html = '<ul class="pagination pagination-sm mb-0">';
          if (prev) html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Назад</a></li>`;
          html += `<li class="page-item disabled"><span class="page-link">Стр. ${currentPage}</span></li>`;
          if (next) html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Вперёд</a></li>`;
          html += '</ul>';
          pagWrap.innerHTML = html;
          pagWrap.querySelectorAll('.page-link[data-page]').forEach((a) => {
            a.addEventListener('click', (e) => { e.preventDefault(); currentPage = parseInt(a.getAttribute('data-page'), 10); loadRecords(); loadSummary(); });
          });
        } else {
          pagWrap.innerHTML = '';
        }
      })
      .catch(() => {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Ошибка загрузки.</td></tr>';
      });
  }

  document.getElementById('btn-apply-filters').addEventListener('click', () => {
    currentPage = 1;
    loadRecords();
    loadSummary();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-subcategory').value = '';
    updateCategoryFilterByType();
    currentPage = 1;
    loadRecords();
    loadSummary();
  });

  document.getElementById('btn-export-csv').addEventListener('click', (e) => {
    e.preventDefault();
    const params = buildParams();
    params.delete('page');
    window.location.href = API + '/records/export/?' + params.toString();
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (!deleteTargetId) return;
    fetch(API + '/records/' + deleteTargetId + '/', { method: 'DELETE', headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' }, credentials: 'same-origin' })
      .then((r) => {
        if (r.ok) {
          showToast('Запись удалена', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modal-delete')).hide();
          loadRecords();
          loadSummary();
        } else {
          showToast('Ошибка удаления', 'danger');
        }
      })
      .catch(() => showToast('Ошибка сети', 'danger'));
    deleteTargetId = null;
  });

  loadRefs().then(() => {
    document.getElementById('filter-type').addEventListener('change', () => {
      updateCategoryFilterByType();
      currentPage = 1;
      loadRecords();
      loadSummary();
    });
    document.getElementById('filter-category').addEventListener('change', () => {
      updateSubcategoryFilterByCategory();
      currentPage = 1;
      loadRecords();
      loadSummary();
    });
    loadRecords();
    loadSummary();
  });
})();
