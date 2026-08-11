from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from products.models import MessageRecipient
from server.utils.typedefs import AuthenticatedRequest

from . import templates


# Create your views here.
def index(request: HttpRequest) -> HttpResponse:
    return templates.HomepageIndex().render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
def inbox(request: AuthenticatedRequest) -> HttpResponse:
    message_recipients = list(
        MessageRecipient.objects.filter(user=request.user)
        .select_related("message", "message__sender")
        .order_by("-message__datetime_created")
    )

    return templates.Inbox(message_recipients=message_recipients).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def mark_message_read(request: AuthenticatedRequest, message_recipient_id: int) -> HttpResponse:
    message_recipient = get_object_or_404(
        MessageRecipient, id=message_recipient_id, user=request.user
    )
    message_recipient.mark_read()

    unread_message_count = MessageRecipient.objects.filter(user=request.user, is_read=False).count()

    return templates.MarkMessageRead(
        success=True, unread_message_count=unread_message_count
    ).render(request)


def error404(
    request: HttpRequest, _exception: Exception, template_name: str = "404.html"
) -> HttpResponse:
    return render(request, template_name, {})


def error500(request: HttpRequest, template_name: str = "500.html") -> HttpResponse:
    return render(request, template_name, {})
