import configparser
import os
from pathlib import Path
from dataclasses import dataclass

config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), "config.ini")
config.read(config_path)

DATABASE_URL = config.get("database", "url")

JWT_TTL = config.getint("jwt", "time_to_live")
JWT_SECRET_KEY = config.get("jwt", "secret")
JWT_ALGORITHM = config.get("jwt", "algorithm")


@dataclass
class SUBMISSIONS_MAPPING:
    submission_number: str = "submission_number"
    about_me: str = "about_me"
    subject_1: str = "subject_1"
    subject_2: str = "subject_2"
    subject_1_answer: str = "subject_1_answer"
    subject_2_answer: str = "subject_2_answer"