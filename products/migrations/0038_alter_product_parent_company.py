# Generated by Django 4.1.5 on 2023-01-22 03:17

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0037_alter_product_parent_company'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='parent_company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='upcs', to='products.brandparentcompany'),
        ),
    ]