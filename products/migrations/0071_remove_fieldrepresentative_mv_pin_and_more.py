# Generated by Django 4.0.1 on 2023-09-11 01:59

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0070_alter_workcycle_cmklaunch_stores_data_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='fieldrepresentative',
            name='mv_pin',
        ),
        migrations.RemoveField(
            model_name='fieldrepresentative',
            name='mv_rep_id',
        ),
        migrations.RemoveField(
            model_name='fieldrepresentative',
            name='mv_user',
        ),
    ]