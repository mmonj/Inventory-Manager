# Generated by Django 4.0.1 on 2023-09-22 02:44

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0072_remove_workcycle_cmklaunch_stores_data_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='store',
            name='store_guids',
        ),
    ]