# Generated by Django 4.0.1 on 2023-08-08 02:47

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0058_scheduledproductadditionupdate_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='scheduledproductadditionupdate',
            name='is_active',
        ),
    ]
