from django import forms

from .models import Planogram, Store


class PlanogramForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100_000, widget=forms.Textarea)
    planogram_pk = forms.ModelChoiceField(
        queryset=Planogram.objects.filter(date_end__isnull=True)
        .order_by("-date_start")
        .select_related("store"),
        empty_label="Select a planogram",
    )
    is_reset_planogram = forms.BooleanField(required=False)


class CreatePlanogramForm(forms.ModelForm[Planogram]):
    store = forms.ModelChoiceField(
        queryset=Store.objects.all(),
        widget=forms.HiddenInput(),
        required=True,
    )

    class Meta:
        model = Planogram
        fields = ["name", "plano_type", "store"]
        widgets = {
            "name": forms.TextInput(
                attrs={"class": "form-control", "placeholder": "Enter planogram name"}
            ),
            "plano_type": forms.Select(attrs={"class": "form-select"}),
        }
        labels = {
            "name": "Planogram Name",
            "plano_type": "Planogram Type",
        }
