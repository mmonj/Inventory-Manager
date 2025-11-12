from django.http import HttpRequest, HttpResponse
from django.shortcuts import render

from . import templates


# Create your views here.
def index(request: HttpRequest) -> HttpResponse:
    return templates.HomepageIndex().render(request)


def error404(
    request: HttpRequest, _exception: Exception, template_name: str = "404.html"
) -> HttpResponse:
    return render(request, template_name, {})


def error500(request: HttpRequest, template_name: str = "500.html") -> HttpResponse:
    return render(request, template_name, {})
