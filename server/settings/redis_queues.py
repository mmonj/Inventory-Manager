import os
from typing import TypedDict

from scheduler.types import QueueConfiguration


class IRedisConnection(TypedDict):
    HOST: str
    PASSWORD: str
    PORT: int
    DB: int
    DEFAULT_TIMEOUT: int


class IRqQueues(TypedDict):
    default: IRedisConnection


RQ_QUEUES: IRqQueues = {
    "default": {
        "HOST": os.environ["REDIS_HOST"],
        "PORT": int(os.environ["REDIS_PORT"]),
        "PASSWORD": os.environ["REDIS_PASSWORD"],
        "DB": 0,
        "DEFAULT_TIMEOUT": 1800,  # seconds
    },
}

SCHEDULER_QUEUES = {
    "default": QueueConfiguration(
        HOST=os.environ["REDIS_HOST"],
        PORT=int(os.environ["REDIS_PORT"]),
        PASSWORD=os.environ["REDIS_PASSWORD"],
        DB=0,
    ),
}
