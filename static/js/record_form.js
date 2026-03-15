(function () {
  const API = '/api';
  const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    if (!container) return;
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

  const form = document.getElementById('record-form');
  const typeSelect = document.getElementById('id_type');
  const categorySelect = document.getElementById('id_category');
  const subcategorySelect = document.getElementById('id_subcategory');

  function loadOptions(url, selectEl, placeholder) {
    selectEl.innerHTML = placeholder ? '<option value="">' + placeholder + '</option>' : '<option value="">Выберите</option>';
    selectEl.disabled = true;
    return fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        list.forEach((item) => {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = item.name;
          selectEl.appendChild(opt);
        });
        selectEl.disabled = false;
      })
      .catch((err) => {
        selectEl.disabled = false;
        selectEl.innerHTML = '<option value="">Ошибка загрузки</option>';
        console.error('loadOptions error', url, err);
      });
  }

  typeSelect.addEventListener('change', () => {
    const typeId = typeSelect.value;
    categorySelect.innerHTML = '<option value="">Сначала выберите тип</option>';
    categorySelect.disabled = true;
    subcategorySelect.innerHTML = '<option value="">Сначала выберите категорию</option>';
    subcategorySelect.disabled = true;
    if (!typeId) return;
    loadOptions(API + '/categories/?type_id=' + typeId, categorySelect, 'Выберите категорию');
  });

  categorySelect.addEventListener('change', () => {
    const categoryId = categorySelect.value;
    subcategorySelect.innerHTML = '<option value="">Сначала выберите категорию</option>';
    subcategorySelect.disabled = true;
    if (!categoryId) return;
    loadOptions(API + '/subcategories/?category_id=' + categoryId, subcategorySelect, 'Выберите подкатегорию');
  });

  function initForm() {
    const recordData = window.recordFormData;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!recordData) {
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById('id_date').value = today;
      if (submitBtn) submitBtn.disabled = true;
      Promise.all([
        loadOptions(API + '/statuses/', document.getElementById('id_status'), 'Выберите статус'),
        loadOptions(API + '/types/', typeSelect, 'Выберите тип'),
      ]).then(() => { if (submitBtn) submitBtn.disabled = false; }).catch(() => { if (submitBtn) submitBtn.disabled = false; });
      return;
    }
    document.getElementById('id_date').value = recordData.date;
    document.getElementById('id_amount').value = recordData.amount;
    document.getElementById('id_comment').value = recordData.comment || '';

    Promise.all([
      fetch(API + '/statuses/').then((r) => r.json()).then((d) => d.results || d || []),
      fetch(API + '/types/').then((r) => r.json()).then((d) => d.results || d || []),
    ]).then(([statuses, types]) => {
      const selStatus = document.getElementById('id_status');
      selStatus.innerHTML = '<option value="">Выберите статус</option>';
      (statuses || []).forEach((s) => {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.name;
        if (s.id === recordData.status) o.selected = true;
        selStatus.appendChild(o);
      });
      typeSelect.innerHTML = '<option value="">Выберите тип</option>';
      (types || []).forEach((t) => {
        const o = document.createElement('option');
        o.value = t.id;
        o.textContent = t.name;
        if (t.id === recordData.type) o.selected = true;
        typeSelect.appendChild(o);
      });

      const typeId = recordData.type;
      if (!typeId) return;
      return fetch(API + '/categories/?type_id=' + typeId).then((r) => r.json()).then((categoriesResp) => {
        const categories = categoriesResp.results || categoriesResp || [];
        categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
        categorySelect.disabled = false;
        categories.forEach((c) => {
          const o = document.createElement('option');
          o.value = c.id;
          o.textContent = c.name;
          if (c.id === recordData.category) o.selected = true;
          categorySelect.appendChild(o);
        });
        const categoryId = recordData.category;
        if (!categoryId) return;
        return fetch(API + '/subcategories/?category_id=' + categoryId).then((r) => r.json()).then((subcategoriesResp) => {
          const subcategories = subcategoriesResp.results || subcategoriesResp || [];
          subcategorySelect.innerHTML = '<option value="">Выберите подкатегорию</option>';
          subcategorySelect.disabled = false;
          subcategories.forEach((s) => {
            const o = document.createElement('option');
            o.value = s.id;
            o.textContent = s.name;
            if (s.id === recordData.subcategory) o.selected = true;
            subcategorySelect.appendChild(o);
          });
        });
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const statusVal = document.getElementById('id_status').value;
    const typeVal = typeSelect.value;
    const categoryVal = categorySelect.value;
    const subcategoryVal = subcategorySelect.value;
    if (!statusVal) { showToast('Выберите статус', 'danger'); return; }
    if (!typeVal) { showToast('Выберите тип', 'danger'); return; }
    if (!categoryVal) { showToast('Выберите категорию', 'danger'); return; }
    if (!subcategoryVal) { showToast('Выберите подкатегорию', 'danger'); return; }
    const amount = parseFloat(document.getElementById('id_amount').value, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Сумма должна быть больше нуля', 'danger');
      return;
    }
    const payload = {
      date: document.getElementById('id_date').value,
      status: parseInt(statusVal, 10),
      type: parseInt(typeVal, 10),
      category: parseInt(categoryVal, 10),
      subcategory: parseInt(subcategoryVal, 10),
      amount: amount,
      comment: document.getElementById('id_comment').value || '',
    };
    const recordId = form.getAttribute('data-record-id');
    const url = recordId ? API + '/records/' + recordId + '/' : API + '/records/';
    const method = recordId ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { 'X-CSRFToken': getCsrf(), 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          showToast('Запись сохранена', 'success');
          setTimeout(() => { window.location.href = '/'; }, 800);
        } else {
          throw data;
        }
      })
      .catch((err) => {
        let msg = 'Ошибка сохранения';
        if (err && typeof err === 'object') {
          const parts = [];
          if (err.category) parts.push(Array.isArray(err.category) ? err.category[0] : err.category);
          if (err.subcategory) parts.push(Array.isArray(err.subcategory) ? err.subcategory[0] : err.subcategory);
          if (err.amount) parts.push(Array.isArray(err.amount) ? err.amount[0] : err.amount);
          if (parts.length) msg = parts.join('. ');
          else if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        }
        showToast(msg, 'danger');
      });
  });

  initForm();
})();
