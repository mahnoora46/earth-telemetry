from pathlib import Path
from datetime import datetime
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

from fetch_epic import main as fetch_once

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
IMAGES_DIR = DATA_DIR / "images"

app = Flask(__name__)
CORS(app)

# ---- helpers ----
def cleanup_images(keep: int = 5):
    """Keep only the newest N images in data/images/."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    imgs = sorted(
        IMAGES_DIR.glob("*.png"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    for old in imgs[keep:]:
        try:
            old.unlink()
        except Exception as e:
            print("Cleanup error:", old, e)

def warm_start():
    """Fetch once and cleanup cache (safe to call multiple times)."""
    try:
        fetch_once()
        cleanup_images(keep=5)
        print("Warm fetch & cleanup complete.")
    except Exception as e:
        print("Warm fetch failed:", e)

# ---- routes ----
@app.get("/api/latest")
def latest():
    meta = (DATA_DIR / "metadata.json")
    if not meta.exists():
        return jsonify({"error": "No data cached yet"}), 404
    return app.response_class(meta.read_text(encoding="utf-8"),
                              mimetype="application/json")

@app.get("/images/<path:name>")
def images(name):
    return send_from_directory(IMAGES_DIR, name)

@app.get("/")
def root():
    return jsonify({"ok": True, "endpoints": ["/api/latest", "/images/<file>"]})

# Manual refresh for cloud (hit this once after deploy)
@app.route("/api/refresh", methods=["GET", "POST"])
def api_refresh():
    try:
        warm_start()
        return jsonify({"ok": True, "refreshed": True}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# In production (gunicorn on Render), before_first_request will trigger warm_start once.
@app.before_first_request
def _warm_once():
    # Avoid double work if you already hit /api/refresh
    if not (DATA_DIR / "metadata.json").exists():
        warm_start()

# ---- local dev boot ----
if __name__ == "__main__":
    # Warm right away for local dev
    warm_start()

    # Schedule every 3 hours (local only; not reliable on free cloud dynos)
    scheduler = BackgroundScheduler(daemon=True)
    def scheduled_job():
        warm_start()
        print("Scheduled fetch & cleanup @", datetime.now().isoformat())
    scheduler.add_job(scheduled_job, "interval", hours=3,
                      next_run_time=datetime.now())
    scheduler.start()

    app.run(host="127.0.0.1", port=5000, debug=True)
