# Generated by Django 4.1.5 on 2023-01-06 05:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_rename_contactinfo_personnelcontact_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='personnelcontact',
            name='first_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='personnelcontact',
            name='last_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
