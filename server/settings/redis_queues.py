import os
from typing import TypedDict


class IRedisConnection(TypedDict):
    HOST: str
    PORT: int
    DB: int
    DEFAULT_TIMEOUT: int


class IRqQueues(TypedDict):
    default: IRedisConnection
    onehub_synccer: IRedisConnection


RQ_QUEUES: IRqQueues = {
    "default": {
        "HOST": os.environ["REDIS_HOST"],
        "PORT": int(os.environ["REDIS_PORT"]),
        "PASSWORD": os.environ["REDIS_PASSWORD"],
        "DB": 0,
        "DEFAULT_TIMEOUT": 1800,  # seconds
    },
}
