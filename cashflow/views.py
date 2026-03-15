"""Представления страниц веб-интерфейса ДДС."""
import json
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from .models import CashFlowRecord


@login_required
def dashboard(request):
    """Главная страница: таблица записей и фильтры."""
    return render(request, 'cashflow/dashboard.html')


@login_required
def record_form(request, pk=None):
    """Создание или редактирование записи ДДС."""
    record = get_object_or_404(CashFlowRecord, pk=pk) if pk else None
    record_json = None
    if record:
        record_json = json.dumps({
            'id': record.id,
            'date': record.date.isoformat(),
            'status': record.status_id,
            'type': record.type_id,
            'category': record.category_id,
            'subcategory': record.subcategory_id,
            'amount': str(record.amount),
            'comment': record.comment or '',
        }, ensure_ascii=False)
        record_json = record_json.replace('</script>', '<\\/script>')
    return render(request, 'cashflow/record_form.html', {
        'record': record,
        'record_json': record_json if record else 'null',
    })


@login_required
def references(request):
    """Страница управления справочниками."""
    return render(request, 'cashflow/references.html')
