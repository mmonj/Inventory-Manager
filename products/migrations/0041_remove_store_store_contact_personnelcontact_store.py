# Generated by Django 4.1.5 on 2023-01-22 22:23

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0040_alter_brandparentcompany_short_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='store',
            name='store_contact',
        ),
        migrations.AddField(
            model_name='personnelcontact',
            name='store',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contacts', to='products.store'),
        ),
    ]