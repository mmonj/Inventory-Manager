# Generated by Django 4.1.5 on 2023-01-22 02:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0034_alter_productaddition_date_added_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='parent_company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='upcs', to='products.brandparentcompany'),
        ),
    ]
