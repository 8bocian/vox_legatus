import configparser
import os
from pathlib import Path

config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), "config.ini")
config.read(config_path)

DATABASE_URL = config.get("database", "url")

JWT_TTL = config.getint("jwt", "time_to_live")
JWT_SECRET_KEY = config.get("jwt", "secret")
JWT_ALGORITHM = config.get("jwt", "algorithm")