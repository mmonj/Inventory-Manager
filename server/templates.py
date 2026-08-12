from typing import Literal, NamedTuple

from reactivated import Pick, interface, template

from products.models import MessageRecipient

TMessageRecipient = Pick[
    MessageRecipient,
    Literal[
        "id",
        "is_read",
        "read_at",
        "datetime_created",
        "message.title",
        "message.body_md",
        "message.datetime_created",
        "message.sender.username",
    ],
]


@template
class HomepageIndex(NamedTuple):
    pass


@template
class Inbox(NamedTuple):
    message_recipients: list[TMessageRecipient]
    has_next: bool


@interface
class MarkMessageRead(NamedTuple):
    success: bool
    unread_message_count: int


@interface
class GetInboxMessages(NamedTuple):
    message_recipients: list[TMessageRecipient]
    has_next: bool


@interface
class SavePushSubscription(NamedTuple):
    success: bool


@interface
class DeletePushSubscription(NamedTuple):
    success: bool
