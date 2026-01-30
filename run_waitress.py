from app import app
from waitress import serve
import logging

# Configure logging
logger = logging.getLogger('waitress')
logger.setLevel(logging.INFO)

if __name__ == '__main__':
    print("Starting production server with Waitress on port 8305...")
    # Production ready server
    # threads=12 is a robust starting point for higher concurrency
    serve(app, host='0.0.0.0', port=8305, threads=12)
