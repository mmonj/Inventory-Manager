# Generated by Django 4.0.1 on 2025-04-26 03:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0078_alter_store_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='store',
            name='name',
            field=models.CharField(blank=True, db_index=True, max_length=255),
        ),
    ]
