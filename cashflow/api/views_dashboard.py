"""Эндпоинт аналитики для дашборда."""
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view
from rest_framework.response import Response

from cashflow.models import CashFlowRecord, Type

MAX_BY_DATE_DAYS = 365
MAX_BY_DATE_POINTS = 500


@api_view(['GET'])
def dashboard_summary(request):
    """Баланс, пополнения, списания и данные для графиков за период."""
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    qs = CashFlowRecord.objects.all()
    if date_from:
        d = parse_date(date_from)
        if d:
            qs = qs.filter(date__gte=d)
    if date_to:
        d = parse_date(date_to)
        if d:
            qs = qs.filter(date__lte=d)

    income_sum = qs.filter(type__is_income=True).aggregate(s=Sum('amount'))['s'] or 0
    expense_sum = qs.filter(type__is_income=False).aggregate(s=Sum('amount'))['s'] or 0
    balance = float(income_sum - expense_sum)

    by_category = list(
        qs.values('category__name').annotate(total=Sum('amount')).order_by('-total')[:10]
    )

    by_date_qs = qs.values('date').annotate(total=Sum('amount')).order_by('date')
    if not date_from and not date_to:
        default_to = timezone.now().date()
        default_from = default_to - timedelta(days=MAX_BY_DATE_DAYS)
        by_date_qs = by_date_qs.filter(date__gte=default_from, date__lte=default_to)
    by_date = list(by_date_qs[:MAX_BY_DATE_POINTS])

    return Response({
        'balance': balance,
        'income_total': float(income_sum),
        'expense_total': float(expense_sum),
        'by_category': [{'category__name': c['category__name'], 'total': float(c['total'])} for c in by_category],
        'by_date': [{'date': str(x['date']), 'total': float(x['total'])} for x in by_date],
    })
