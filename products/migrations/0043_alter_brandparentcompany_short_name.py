# Generated by Django 4.1.5 on 2023-01-25 19:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0042_alter_brandparentcompany_short_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='brandparentcompany',
            name='short_name',
            field=models.CharField(max_length=50, null=True, unique=True),
        ),
    ]