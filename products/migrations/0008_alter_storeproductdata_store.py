# Generated by Django 4.1.5 on 2023-01-06 06:16

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_alter_personnelcontact_first_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='storeproductdata',
            name='store',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='associated_upcs', to='products.store'),
        ),
    ]
