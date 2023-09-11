# Generated by Django 4.0.1 on 2023-09-11 01:05

from django.db import migrations, models
import survey_worker.interfaces


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0069_alter_workcycle_cmklaunch_stores_data_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workcycle',
            name='cmklaunch_stores_data',
            field=models.JSONField(blank=True, default=survey_worker.interfaces.init_cmkstore_refresh_data, null=True),
        ),
        migrations.AlterField(
            model_name='workcycle',
            name='cmklaunch_urls',
            field=models.JSONField(blank=True, default=list, null=True),
        ),
    ]
