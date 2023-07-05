from django import forms

from .models import Planogram


class PlanogramForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100_000, widget=forms.Textarea)
    planogram_pk = forms.ModelChoiceField(
        queryset=Planogram.objects.all().order_by("store__name").select_related("store"),
        empty_label="Select a planogram",
    )
