from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request: HttpRequest) -> HttpResponse:
    return render(request, "homepage/index.html")


def error404(
    request: HttpRequest, _exception: Exception, template_name: str = "500.html"  # noqa: ARG001
) -> HttpResponse:
    return render(request, "_common/error404.html", {})


def error500(request: HttpRequest, template_name: str = "500.html") -> HttpResponse:  # noqa: ARG001
    return render(request, "_common/error500.html", {})
