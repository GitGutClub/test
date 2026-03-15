"""DRF сериализаторы с валидацией зависимостей category/type и subcategory/category."""
from rest_framework import serializers
from cashflow.models import Status, Type, Category, Subcategory, CashFlowRecord


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ('id', 'name')


class TypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Type
        fields = ('id', 'name', 'is_income')


class CategorySerializer(serializers.ModelSerializer):
    type_name = serializers.CharField(source='type.name', read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'type', 'type_name')
        extra_kwargs = {'type': {'required': True}}


class SubcategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Subcategory
        fields = ('id', 'name', 'category', 'category_name')
        extra_kwargs = {'category': {'required': True}}


class CashFlowRecordSerializer(serializers.ModelSerializer):
    status_name = serializers.CharField(source='status.name', read_only=True)
    type_name = serializers.CharField(source='type.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = CashFlowRecord
        fields = (
            'id', 'date', 'status', 'status_name', 'type', 'type_name',
            'category', 'category_name', 'subcategory', 'subcategory_name',
            'amount', 'comment', 'created_at', 'updated_at'
        )
        extra_kwargs = {
            'status': {'required': True},
            'amount': {'required': True},
            'type': {'required': True},
            'category': {'required': True},
            'subcategory': {'required': True},
        }

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Сумма должна быть больше нуля.')
        return value

    def validate(self, attrs):
        type_obj = attrs.get('type')
        category = attrs.get('category')
        subcategory = attrs.get('subcategory')
        if type_obj and category and category.type_id != type_obj.id:
            raise serializers.ValidationError(
                {'category': 'Категория должна относиться к выбранному типу.'}
            )
        if category and subcategory and subcategory.category_id != category.id:
            raise serializers.ValidationError(
                {'subcategory': 'Подкатегория должна относиться к выбранной категории.'}
            )
        return attrs
