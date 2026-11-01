from typing import Any

from django.db import migrations, models


def populate_status_and_old_plano_shape(apps: Any, _schema_editor: Any) -> None:
    PlanogramUpdate = apps.get_model("product_locator", "PlanogramUpdate")

    # Superseded updates were stored as is_applied=True and can't be told apart from applied ones
    PlanogramUpdate.objects.filter(is_applied=False).update(status="pending", old_plano=None)

    for planogram_update in PlanogramUpdate.objects.filter(is_applied=True):
        old_plano = {
            location: [product] for location, product in planogram_update.old_plano.items()
        }
        PlanogramUpdate.objects.filter(pk=planogram_update.pk).update(
            status="applied", old_plano=old_plano
        )


class Migration(migrations.Migration):

    dependencies = [
        ('product_locator', '0009_alter_planogram_horizontal_section_thresholds'),
    ]

    operations = [
        migrations.AddField(
            model_name='planogramupdate',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('applied', 'Applied'), ('superseded', 'Superseded')], default='pending', max_length=10),
        ),
        migrations.AlterField(
            model_name='planogramupdate',
            name='old_plano',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RunPython(populate_status_and_old_plano_shape, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='planogramupdate',
            name='is_applied',
        ),
    ]
