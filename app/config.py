import configparser
from pathlib import Path

config = configparser.ConfigParser()
config.read("config.ini")

DATABASE_URL = config.get("database", "url")

JWT_TTL = config.get("jwt", "time_to_live")
JWT_SECRET_KEY = config.get("jwt", "secret")
JWT_ALGORITHM = config.get("jwt", "algorithm")