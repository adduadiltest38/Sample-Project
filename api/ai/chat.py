"""
Vercel Python function: POST /api/ai/chat

Serves the same predefined-question AI as ai-service/chargeflow_ai.py.
The browser sends the trip data as `aiContext`, so no other backend is needed.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
for candidate in (os.path.join(HERE, "..", "..", "ai-service"), os.path.join(os.getcwd(), "ai-service")):
    if os.path.isdir(candidate) and candidate not in sys.path:
        sys.path.insert(0, candidate)

from chargeflow_ai import answer  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._send(400, {"error": "Body must be JSON"})
            return
        message = str(body.get("message", "")).strip()[:500]
        if not message:
            self._send(400, {"error": '"message" is required'})
            return
        result = answer(message, body.get("aiContext") or {})
        self._send(200, {"reply": result["reply"], "source": "python", "suggestions": result.get("suggestions", [])})

    def do_GET(self) -> None:
        self._send(200, {"ok": True, "service": "chargeflow-ai"})
