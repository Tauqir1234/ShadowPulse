import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, agent_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(agent_id, []).append(ws)

    def disconnect(self, agent_id: str, ws: WebSocket):
        if agent_id in self.active and ws in self.active[agent_id]:
            self.active[agent_id].remove(ws)

    async def broadcast(self, agent_id: str, message: dict):
        for ws in list(self.active.get(agent_id, [])):
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                self.disconnect(agent_id, ws)

manager = ConnectionManager()
