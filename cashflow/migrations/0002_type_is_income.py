# Generated manually for DDS audit

from django.db import migrations, models


def set_expense_types(apps, schema_editor):
    Type = apps.get_model('cashflow', 'Type')
    Type.objects.filter(name__icontains='списан').update(is_income=False)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cashflow', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='type',
            name='is_income',
            field=models.BooleanField(default=True, verbose_name='Доход (пополнение)'),
        ),
        migrations.RunPython(set_expense_types, noop),
    ]
