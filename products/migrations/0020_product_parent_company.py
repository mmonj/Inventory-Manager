# Generated by Django 4.1.5 on 2023-01-10 03:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0019_alter_fieldrepresentative_work_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='parent_company',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]