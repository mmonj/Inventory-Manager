from django.db import models


class Store(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Planogram(models.Model):
    name = models.CharField(max_length=50, default="Inline Plano")
    store = models.ForeignKey(Store, null=True, on_delete=models.CASCADE, related_name="planograms")

    def __str__(self):
        return f"{self.name} - {self.store}"

    class Meta:
        unique_together = ["name", "store"]


class HomeLocation(models.Model):
    name = models.CharField(max_length=25)
    planogram = models.ForeignKey(Planogram, on_delete=models.CASCADE, related_name="locations")

    def __str__(self):
        return f"{self.name} - {self.planogram}"

    class Meta:
        unique_together = ["name", "planogram"]


class Product(models.Model):
    upc = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    home_locations = models.ManyToManyField(HomeLocation, related_name="products")

    def __str__(self):
        return f"{self.upc} {self.name}"
