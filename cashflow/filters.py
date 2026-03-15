"""Фильтры для списка записей ДДС (django-filter)."""
import django_filters
from .models import CashFlowRecord


class CashFlowRecordFilter(django_filters.FilterSet):
    """Фильтрация записей по дате, статусу, типу, категории, подкатегории."""
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte', label='Дата с')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte', label='Дата по')
    status = django_filters.NumberFilter(field_name='status_id')
    type = django_filters.NumberFilter(field_name='type_id')
    category = django_filters.NumberFilter(field_name='category_id')
    subcategory = django_filters.NumberFilter(field_name='subcategory_id')

    class Meta:
        model = CashFlowRecord
        fields = ['date_from', 'date_to', 'status', 'type', 'category', 'subcategory']
