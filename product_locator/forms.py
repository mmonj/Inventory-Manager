from django import forms

from .models import Planogram, Store


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
