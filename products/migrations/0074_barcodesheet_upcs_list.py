# Generated by Django 4.0.1 on 2023-09-29 02:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0073_remove_store_store_guids'),
    ]

    operations = [
        migrations.AddField(
            model_name='barcodesheet',
            name='upcs_list',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
