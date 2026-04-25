"""
Akshara-Flow — Adaptive Agentic Backend
Flask application entry point.

Run from the backend/ directory:
    pip install -r requirements.txt
    python app.py

Or with gunicorn:
    gunicorn app:app --workers 2 --timeout 30
"""
import os
import sys
import logging

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

from flask import Flask, jsonify

# backend/ must be in sys.path so `from IP.agents...` resolves to backend/IP/
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from IP.routes.analyze import analyze_bp

app = Flask(__name__)
app.register_blueprint(analyze_bp)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "akshara-flow-architect"}), 200


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5050)
