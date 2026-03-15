"""Тесты приложения cashflow: модели, API, сериализаторы, фильтры."""
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Status, Type, Category, Subcategory, CashFlowRecord

User = get_user_model()


class CashFlowRecordModelTests(TestCase):
    """Валидация модели CashFlowRecord: category/type, subcategory/category, amount > 0."""

    def setUp(self):
        self.status = Status.objects.create(name='Бизнес')
        self.type_income = Type.objects.create(name='Пополнение', is_income=True)
        self.type_expense = Type.objects.create(name='Списание', is_income=False)
        self.category = Category.objects.create(name='Маркетинг', type=self.type_expense)
        self.subcategory = Subcategory.objects.create(name='Avito', category=self.category)

    def test_valid_record_saves(self):
        record = CashFlowRecord(
            status=self.status,
            type=self.type_expense,
            category=self.category,
            subcategory=self.subcategory,
            amount=Decimal('100.00'),
        )
        record.full_clean()
        record.save()
        self.assertEqual(record.amount, Decimal('100.00'))

    def test_category_must_match_type(self):
        category_income = Category.objects.create(name='Доходы', type=self.type_income)
        record = CashFlowRecord(
            status=self.status,
            type=self.type_expense,
            category=category_income,
            subcategory=self.subcategory,
            amount=Decimal('100.00'),
        )
        with self.assertRaises(ValidationError) as ctx:
            record.full_clean()
        self.assertIn('category', ctx.exception.message_dict)

    def test_subcategory_must_match_category(self):
        other_category = Category.objects.create(name='Другое', type=self.type_expense)
        other_sub = Subcategory.objects.create(name='Другое', category=other_category)
        record = CashFlowRecord(
            status=self.status,
            type=self.type_expense,
            category=self.category,
            subcategory=other_sub,
            amount=Decimal('100.00'),
        )
        with self.assertRaises(ValidationError) as ctx:
            record.full_clean()
        self.assertIn('subcategory', ctx.exception.message_dict)

    def test_amount_must_be_positive(self):
        record = CashFlowRecord(
            status=self.status,
            type=self.type_expense,
            category=self.category,
            subcategory=self.subcategory,
            amount=Decimal('0'),
        )
        with self.assertRaises(ValidationError) as ctx:
            record.full_clean()
        self.assertIn('amount', ctx.exception.message_dict)

    def test_save_calls_full_clean(self):
        record = CashFlowRecord(
            status=self.status,
            type=self.type_expense,
            category=self.category,
            subcategory=self.subcategory,
            amount=Decimal('-1'),
        )
        with self.assertRaises(ValidationError):
            record.save()


class CashFlowRecordSerializerTests(TestCase):
    """Валидация сериализатора: amount, category/type, subcategory/category."""

    def setUp(self):
        self.status = Status.objects.create(name='Бизнес')
        self.type_income = Type.objects.create(name='Пополнение', is_income=True)
        self.type_expense = Type.objects.create(name='Списание', is_income=False)
        self.category = Category.objects.create(name='Маркетинг', type=self.type_expense)
        self.subcategory = Subcategory.objects.create(name='Avito', category=self.category)

    def test_validate_amount_positive(self):
        from .api.serializers import CashFlowRecordSerializer
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': self.category.id,
            'subcategory': self.subcategory.id,
            'amount': Decimal('0'),
            'date': '2025-01-15',
        }
        serializer = CashFlowRecordSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_validate_category_type_mismatch(self):
        from .api.serializers import CashFlowRecordSerializer
        category_income = Category.objects.create(name='Доходы', type=self.type_income)
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': category_income.id,
            'subcategory': self.subcategory.id,
            'amount': Decimal('100.00'),
            'date': '2025-01-15',
        }
        serializer = CashFlowRecordSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('category', serializer.errors)

    def test_validate_subcategory_category_mismatch(self):
        from .api.serializers import CashFlowRecordSerializer
        other_category = Category.objects.create(name='Другое', type=self.type_expense)
        other_sub = Subcategory.objects.create(name='Другое', category=other_category)
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': self.category.id,
            'subcategory': other_sub.id,
            'amount': Decimal('100.00'),
            'date': '2025-01-15',
        }
        serializer = CashFlowRecordSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('subcategory', serializer.errors)

    def test_valid_data_creates_record(self):
        from .api.serializers import CashFlowRecordSerializer
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': self.category.id,
            'subcategory': self.subcategory.id,
            'amount': Decimal('100.50'),
            'date': '2025-01-15',
            'comment': 'Test',
        }
        serializer = CashFlowRecordSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        record = serializer.save()
        self.assertEqual(record.amount, Decimal('100.50'))
        self.assertEqual(record.comment, 'Test')


class CashFlowRecordFilterTests(TestCase):
    """Фильтрация записей по дате, статусу, типу."""

    def setUp(self):
        self.status = Status.objects.create(name='Бизнес')
        self.type_expense = Type.objects.create(name='Списание', is_income=False)
        self.category = Category.objects.create(name='Маркетинг', type=self.type_expense)
        self.subcategory = Subcategory.objects.create(name='Avito', category=self.category)
        self.record = CashFlowRecord.objects.create(
            status=self.status,
            type=self.type_expense,
            category=self.category,
            subcategory=self.subcategory,
            amount=Decimal('100.00'),
        )

    def test_filter_by_date_from(self):
        from .filters import CashFlowRecordFilter
        qs = CashFlowRecord.objects.all()
        f = CashFlowRecordFilter({'date_from': self.record.date.isoformat()}, queryset=qs)
        self.assertTrue(f.is_valid())
        self.assertEqual(f.qs.count(), 1)

    def test_filter_by_type(self):
        from .filters import CashFlowRecordFilter
        qs = CashFlowRecord.objects.all()
        f = CashFlowRecordFilter({'type': self.type_expense.id}, queryset=qs)
        self.assertTrue(f.is_valid())
        self.assertEqual(f.qs.count(), 1)


class CashFlowAPITests(TestCase):
    """API: аутентификация, создание записи, экспорт, dashboard summary."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.status = Status.objects.create(name='Бизнес')
        self.type_expense = Type.objects.create(name='Списание', is_income=False)
        self.category = Category.objects.create(name='Маркетинг', type=self.type_expense)
        self.subcategory = Subcategory.objects.create(name='Avito', category=self.category)

    def test_records_list_requires_auth(self):
        client_anon = APIClient()
        r = client_anon.get('/api/records/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_record_success(self):
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': self.category.id,
            'subcategory': self.subcategory.id,
            'amount': '200.00',
            'date': '2025-02-01',
        }
        r = self.client.post('/api/records/', data, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CashFlowRecord.objects.count(), 1)

    def test_create_record_invalid_category_type_rejected(self):
        type_income = Type.objects.create(name='Пополнение', is_income=True)
        cat_income = Category.objects.create(name='Доходы', type=type_income)
        data = {
            'status': self.status.id,
            'type': self.type_expense.id,
            'category': cat_income.id,
            'subcategory': self.subcategory.id,
            'amount': '100.00',
            'date': '2025-02-01',
        }
        r = self.client.post('/api/records/', data, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', r.data)

    def test_export_returns_csv(self):
        r = self.client.get('/api/records/export/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r.get('Content-Type', ''))

    def test_dashboard_summary_returns_balance(self):
        r = self.client.get('/api/dashboard/summary/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('balance', r.data)
        self.assertIn('income_total', r.data)
        self.assertIn('expense_total', r.data)
        self.assertIn('by_category', r.data)
        self.assertIn('by_date', r.data)
