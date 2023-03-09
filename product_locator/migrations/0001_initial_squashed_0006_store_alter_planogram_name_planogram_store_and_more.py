# Generated by Django 4.1.5 on 2023-03-09 08:56

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    replaces = [('product_locator', '0001_initial'), ('product_locator', '0002_alter_product_name'), ('product_locator', '0003_rename_location_homelocation_name'), ('product_locator', '0004_alter_planogram_name_alter_product_upc_and_more'), ('product_locator', '0005_alter_planogram_name'), ('product_locator', '0006_store_alter_planogram_name_planogram_store_and_more')]

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Planogram',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default='Inline Plano', max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name='HomeLocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=25)),
                ('planogram', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='locations', to='product_locator.planogram')),
            ],
            options={
                'unique_together': {('name', 'planogram')},
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('upc', models.CharField(max_length=12, unique=True)),
                ('name', models.CharField(blank=True, max_length=100, null=True)),
                ('home_locations', models.ManyToManyField(related_name='products', to='product_locator.homelocation')),
            ],
        ),
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
        migrations.AddField(
            model_name='planogram',
            name='store',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='planograms', to='product_locator.store'),
        ),
        migrations.AlterUniqueTogether(
            name='planogram',
            unique_together={('name', 'store')},
        ),
    ]