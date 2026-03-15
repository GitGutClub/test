"""DRF ViewSets и эндпоинты для записей ДДС и справочников."""
import csv
import io
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from cashflow.models import Status, Type, Category, Subcategory, CashFlowRecord
from cashflow.filters import CashFlowRecordFilter
from .serializers import (
    StatusSerializer,
    TypeSerializer,
    CategorySerializer,
    SubcategorySerializer,
    CashFlowRecordSerializer,
)


class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']


class TypeViewSet(viewsets.ModelViewSet):
    queryset = Type.objects.all()
    serializer_class = TypeSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        type_id = self.request.query_params.get('type_id')
        if type_id:
            qs = qs.filter(type_id=type_id)
        return qs


class SubcategoryViewSet(viewsets.ModelViewSet):
    queryset = Subcategory.objects.all()
    serializer_class = SubcategorySerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class CashFlowRecordViewSet(viewsets.ModelViewSet):
    queryset = CashFlowRecord.objects.select_related('status', 'type', 'category', 'subcategory')
    serializer_class = CashFlowRecordSerializer
    filterset_class = CashFlowRecordFilter
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """Экспорт отфильтрованных записей в CSV."""
        qs = self.filter_queryset(self.get_queryset())[:10000]
        serializer = CashFlowRecordSerializer(qs, many=True)
        data = serializer.data
        fieldnames = ['id', 'date', 'status_name', 'type_name', 'category_name', 'subcategory_name', 'amount', 'comment']
        buf = io.StringIO()
        buf.write('\ufeff')
        writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
        response = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="dds_export.csv"'
        return response


