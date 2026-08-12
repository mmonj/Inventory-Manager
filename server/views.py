from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db import models
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.loader import get_template
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from products.models import MessageRecipient, PushSubscription
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
    page_obj, pagination_data = unwrap(pagination_result)

    return templates.Inbox(
        message_recipients=list(page_obj.object_list), has_next=pagination_data.has_next
    ).render(request)


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

    page_obj, pagination_data = pagination_result.value

    return templates.GetInboxMessages(
        message_recipients=list(page_obj.object_list), has_next=pagination_data.has_next
    ).render(request)


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


def service_worker(_request: HttpRequest) -> HttpResponse:
    """
    Served from the site root (not /static/) so the worker's scope covers the whole site -
    a worker registered from a subdirectory can only control pages under that subdirectory.
    Plain JS, not a Django-templated response - get_template().render() is only used here to
    reuse the existing client/html/ template dir rather than reading the file by hand.
    """
    content = get_template("sw.js").render()
    response = HttpResponse(content, content_type="application/javascript")
    # Without this, browsers apply an implicit ~24h cache to the service worker script
    # itself (per spec) when no explicit caching header is present - registration.update()
    # (see usePushNotifications.ts) would then compare against a browser-cached copy of
    # this response instead of re-fetching it, silently never picking up a real change.
    response["Cache-Control"] = "no-cache"
    return response


def pwa_manifest(_request: HttpRequest) -> HttpResponse:
    """
    Served dynamically (not a static file) so icon paths can use the real STATIC_URL - that's
    an env-configurable setting (differs between dev's /collected/ and whatever prod uses), so
    hardcoding either would break in the other environment.
    """
    return JsonResponse(
        {
            "name": "Inventory Manager",
            "short_name": "Inventory Manager",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#0d6efd",
            "icons": [
                {
                    "src": f"{settings.STATIC_URL}public/favicon.png",
                    "sizes": "50x50",
                    "type": "image/png",
                }
            ],
        }
    )


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def save_push_subscription(request: AuthenticatedRequest) -> HttpResponse:
    endpoint = request.POST.get("endpoint")
    p256dh_key = request.POST.get("p256dh_key")
    auth_key = request.POST.get("auth_key")

    if not endpoint or not p256dh_key or not auth_key:
        return error_json_response(["Missing endpoint, p256dh_key, or auth_key"], status=400)

    PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={"user": request.user, "p256dh_key": p256dh_key, "auth_key": auth_key},
    )

    return templates.SavePushSubscription(success=True).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def delete_push_subscription(request: AuthenticatedRequest) -> HttpResponse:
    endpoint = request.POST.get("endpoint")
    if not endpoint:
        return error_json_response(["Missing endpoint"], status=400)

    PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()

    return templates.DeletePushSubscription(success=True).render(request)


def error404(
    request: HttpRequest, _exception: Exception, template_name: str = "404.html"
) -> HttpResponse:
    return render(request, template_name, {})


def error500(request: HttpRequest, template_name: str = "500.html") -> HttpResponse:
    return render(request, template_name, {})
