from django.contrib.auth.decorators import login_required
from django.db import models
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from products.models import MessageRecipient
from server.utils.common import error_json_response, get_pagination_data, unwrap
from server.utils.typedefs import AuthenticatedRequest

from . import templates

INBOX_PAGE_SIZE = 25


def get_inbox_message_recipients_queryset(user_id: int) -> models.QuerySet[MessageRecipient]:
    return (
        MessageRecipient.objects.filter(user_id=user_id)
        .select_related("message", "message__sender")
        .order_by("-message__datetime_created")
    )


# Create your views here.
def index(request: HttpRequest) -> HttpResponse:
    return templates.HomepageIndex().render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
def inbox(request: AuthenticatedRequest) -> HttpResponse:
    pagination_result = get_pagination_data(
        get_inbox_message_recipients_queryset(request.user.id), page=1, page_size=INBOX_PAGE_SIZE
    )
    page_obj, _ = unwrap(pagination_result)

    return templates.Inbox(message_recipients=list(page_obj.object_list)).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def get_inbox_messages(request: AuthenticatedRequest) -> HttpResponse:
    page_param = request.GET.get("page")
    if page_param is None:
        return error_json_response(["Missing page"], status=400)

    pagination_result = get_pagination_data(
        get_inbox_message_recipients_queryset(request.user.id),
        page=int(page_param),
        page_size=INBOX_PAGE_SIZE,
    )
    if not pagination_result.ok:
        return error_json_response([str(pagination_result.err)], status=400)

    page_obj, _ = pagination_result.value

    return templates.GetInboxMessages(message_recipients=list(page_obj.object_list)).render(request)


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
