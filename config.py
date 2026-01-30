import os
import urllib.parse

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'sports_complex_secret_key_2025'
    
    # Only allow MySQL configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'exult123')  # default password for local MySQL5
    MYSQL_DB = os.environ.get('MYSQL_DB', 'work_logs')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
    # URL encode password to handle special characters
    encoded_password = urllib.parse.quote_plus(MYSQL_PASSWORD)
    # MySQL SQLAlchemy configuration
    # Use utf8 (compatible with MySQL5) by default
    SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{MYSQL_USER}:{encoded_password}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_timeout': 20,
        'pool_recycle': 3600,  # Recycle connections every 1 hour (3600 seconds) - CRITICAL FIX
        'pool_pre_ping': True,  # Test connections before using them
        'pool_size': 10,  # Maximum number of permanent connections
        'max_overflow': 20,  # Maximum number of temporary connections
        'echo': False,  # Set to True for SQL debugging
        'connect_args': {
            'connect_timeout': 60,
            'read_timeout': 60,
            'write_timeout': 60
        }
    }

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # In production, prefer environment variables
    if os.environ.get('DATABASE_URL'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}