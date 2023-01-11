# Generated by Django 4.1.5 on 2023-01-06 05:34

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_contactinfo'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='ContactInfo',
            new_name='PersonnelContact',
        ),
        migrations.RemoveField(
            model_name='store',
            name='contact_name',
        ),
        migrations.AddField(
            model_name='store',
            name='store_contact',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.DO_NOTHING, to='products.personnelcontact'),
        ),
    ]
