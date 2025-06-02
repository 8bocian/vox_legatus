from enum import Enum


class PollStatus(Enum):
    WAITING_FOR_ACTIVATION = "Oczekuje na aktywacje"
    ACTIVE = "Aktywne"
    FINISHED = "Skończone"
