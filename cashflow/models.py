"""
Модели для учёта движения денежных средств (ДДС).
Справочники: Status, Type, Category, Subcategory.
Записи: CashFlowRecord с валидацией зависимостей category/type и subcategory/category.
"""
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Status(models.Model):
    """Справочник статусов: Бизнес, Личное, Налог и т.д."""
    name = models.CharField('Название', max_length=100, unique=True)

    class Meta:
        verbose_name = 'Статус'
        verbose_name_plural = 'Статусы'
        ordering = ['name']

    def __str__(self):
        return self.name


class Type(models.Model):
    """Справочник типов: Пополнение, Списание и т.д."""
    name = models.CharField('Название', max_length=100, unique=True)
    is_income = models.BooleanField('Доход (пополнение)', default=True)

    class Meta:
        verbose_name = 'Тип'
        verbose_name_plural = 'Типы'
        ordering = ['name']

    def __str__(self):
        return self.name


class Category(models.Model):
    """Категория, привязанная к типу (например, Маркетинг к типу Списание)."""
    name = models.CharField('Название', max_length=200)
    type = models.ForeignKey(Type, on_delete=models.CASCADE, related_name='categories', verbose_name='Тип')

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['type', 'name']
        unique_together = [['name', 'type']]

    def __str__(self):
        return f'{self.name} ({self.type.name})'


class Subcategory(models.Model):
    """Подкатегория, привязанная к категории (например, Farpost, Avito к Маркетинг)."""
    name = models.CharField('Название', max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories', verbose_name='Категория')

    class Meta:
        verbose_name = 'Подкатегория'
        verbose_name_plural = 'Подкатегории'
        ordering = ['category', 'name']
        unique_together = [['name', 'category']]

    def __str__(self):
        return f'{self.name} ({self.category.name})'


class CashFlowRecord(models.Model):
    """Запись о движении денежных средств."""
    date = models.DateField('Дата', default=timezone.now)
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name='records', verbose_name='Статус')
    type = models.ForeignKey(Type, on_delete=models.PROTECT, related_name='records', verbose_name='Тип')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='records', verbose_name='Категория')
    subcategory = models.ForeignKey(Subcategory, on_delete=models.PROTECT, related_name='records', verbose_name='Подкатегория')
    amount = models.DecimalField('Сумма (руб.)', max_digits=12, decimal_places=2)
    comment = models.TextField('Комментарий', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Запись ДДС'
        verbose_name_plural = 'Записи ДДС'
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.date} {self.type.name} {self.amount}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if not self.type_id or not self.category_id or not self.subcategory_id:
            return
        if self.category.type_id != self.type_id:
            raise ValidationError({'category': 'Категория должна относиться к выбранному типу.'})
        if self.subcategory.category_id != self.category_id:
            raise ValidationError({'subcategory': 'Подкатегория должна относиться к выбранной категории.'})
        if self.amount is not None and self.amount <= 0:
            raise ValidationError({'amount': 'Сумма должна быть больше нуля.'})
