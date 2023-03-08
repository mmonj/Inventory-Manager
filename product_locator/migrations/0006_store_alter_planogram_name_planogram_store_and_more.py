# Generated by Django 4.1.5 on 2023-03-07 06:58

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('product_locator', '0005_alter_planogram_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
        migrations.AlterField(
            model_name='planogram',
            name='name',
            field=models.CharField(default='Inline Plano', max_length=50),
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
