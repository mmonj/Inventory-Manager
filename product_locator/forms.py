from django import forms

from .models import Planogram


class PlanogramForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100_000, widget=forms.Textarea)
    planogram_pk = forms.ModelChoiceField(
        queryset=Planogram.objects.filter(date_end__isnull=True)
        .order_by("-date_start")
        .select_related("store"),
        empty_label="Select a planogram",
    )
    is_reset_planogram = forms.BooleanField(required=False)
