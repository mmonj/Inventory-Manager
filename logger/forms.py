from django import forms


class NewStoresForm(forms.Form):
    stores_text = forms.CharField(widget=forms.Textarea(), max_length=5000)


class ImportJsonDataFiles(forms.Form):
    field_reps_json = forms.FileField()
    territory_info_json = forms.FileField()
    product_names_json = forms.FileField()
    store_distribution_data_json = forms.FileField()
    product_images_zip = forms.FileField()
    brand_logos_zip = forms.FileField()
