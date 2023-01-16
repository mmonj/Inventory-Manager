# Generated by Django 4.1.5 on 2023-01-16 00:48

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0029_alter_store_field_representative'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='parent_company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='upcs', to='products.brandparentcompany'),
        ),
    ]