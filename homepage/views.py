from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request: HttpRequest) -> HttpResponse:
    return render(request, "homepage/index.html")


def error404(
    request: HttpRequest, _exception: Exception, template_name: str = "404.html"
) -> HttpResponse:
    return render(request, template_name, {})


def error500(request: HttpRequest, template_name: str = "500.html") -> HttpResponse:
    return render(request, template_name, {})
