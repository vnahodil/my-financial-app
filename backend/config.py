# config.py
import os
from dotenv import load_dotenv

# Find the absolute path of the directory containing this file
basedir = os.path.abspath(os.path.dirname(__file__))
# Load environment variables from .env file located in the basedir
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess' # Change in production!
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db') # Fallback to SQLite if DATABASE_URL not set
    SQLALCHEMY_TRACK_MODIFICATIONS = False