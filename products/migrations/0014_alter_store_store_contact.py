# Generated by Django 4.1.5 on 2023-01-06 06:33

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_alter_productaddition_unique_together'),
    ]

    operations = [
        migrations.AlterField(
            model_name='store',
            name='store_contact',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.DO_NOTHING, related_name='associated_stores', to='products.personnelcontact'),
        ),
    ]