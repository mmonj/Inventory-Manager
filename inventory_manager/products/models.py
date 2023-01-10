import datetime
from django.db import models

class WorkCycle(models.Model):
    start_date = models.DateField(default=datetime.date.today)
    end_date = models.DateField(default=datetime.date.today)

    def __str__(self):
        return f'{self.start_date} to {self.end_date}'


class FieldRepresentative(models.Model):
    name = models.CharField(max_length=255)
    work_email = models.EmailField(max_length=255, unique=True)

    def __str__(self):
        return f'{self.name}; {self.work_email}'


class BrandParentCompany(models.Model):
    short_name = models.CharField(max_length=50, unique=True, null=True)
    expanded_name = models.CharField(max_length=50, unique=True, null=True, blank=True)

    def __str__(self):
        return self.expanded_name or self.short_name


class Product(models.Model):
    upc = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    parent_company = models.ForeignKey(BrandParentCompany, null=True, blank=True, on_delete=models.DO_NOTHING, related_name='upcs')

    def __str__(self):
        return f'{self.upc}: {self.name}'


class PersonnelContact(models.Model):
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        if not self.first_name and not self.last_name:
            return '<Blank>'
        return f'{self.first_name} {self.last_name}'


class Store(models.Model):
    name = models.CharField(max_length=255, null=True, unique=True)
    store_contact = models.ForeignKey(PersonnelContact, null=True, on_delete=models.DO_NOTHING, related_name="associated_stores")
    field_representative = models.ForeignKey(FieldRepresentative, null=True, blank=True, on_delete=models.DO_NOTHING, related_name="stores")

    def __str__(self):
        return f'{self.name}'


class ProductAddition(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="associated_additions")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="associated_additions")
    added_date = models.DateField(default=datetime.date.today)
    is_carried = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.product.upc}; Carried {self.is_carried}; Store {self.store}'

    class Meta:
        unique_together = ('store', 'product',)
