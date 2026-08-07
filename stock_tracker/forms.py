from django import forms


class NewStoresForm(forms.Form):
    stores_text = forms.CharField(widget=forms.Textarea(), max_length=5000)
