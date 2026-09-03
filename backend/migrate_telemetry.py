from pymongo import MongoClient
from datetime import datetime
import dateutil.parser

def migrate():
    client = MongoClient("mongodb://localhost:27017")
    src_db = client.shadowpulse_telemetry
    dst_db = client.shadowpulse

    print("Clearing old shadowpulse data...")
    for coll in ['cpu_metrics', 'memory_metrics', 'disk_metrics', 'network_metrics', 'process_events', 'file_events', 'system_events', 'agents']:
        dst_db[coll].delete_many({})

    print("Fetching host_snapshots...")
    cursor = src_db.host_snapshots.find().limit(5000) # limit to 5000 to keep it fast

    agent_id = "agent-migrated"
    dst_db.agents.insert_one({"agent_id": agent_id, "status": "active"})

    cpu_docs = []
    mem_docs = []
    disk_docs = []
    net_docs = []
    process_docs = []
    file_docs = []
    system_docs = []

    count = 0
    for doc in cursor:
        ts_str = doc.get("@timestamp")
        if not ts_str:
            continue
        try:
            ts = dateutil.parser.isoparse(ts_str).replace(tzinfo=None)
        except Exception:
            ts = datetime.utcnow()
        
        sys_res = doc.get("system_health", {})
        net = doc.get("network_activity", {})
        ai = doc.get("ai_behavioral_features", {})

        cpu_pct = sys_res.get("cpu_usage_pct", 20.0)
        mem_pct = sys_res.get("memory_usage_pct", 40.0)
        disk_pct = sys_res.get("disk_usage_pct", 50.0)
        disk_r = sys_res.get("disk_read_bytes", 0)
        disk_w = sys_res.get("disk_write_bytes", 0)

        net_s = net.get("bytes_sent", 0)
        net_r = net.get("bytes_recv", 0)
        net_conn = net.get("active_connections_count", 0)

        cpu_docs.append({"agent_id": agent_id, "timestamp": ts, "cpu_usage_percent": cpu_pct})
        mem_docs.append({"agent_id": agent_id, "timestamp": ts, "used_percent": mem_pct})
        disk_docs.append({"agent_id": agent_id, "timestamp": ts, "used_percent": disk_pct, "read_bytes": disk_r, "write_bytes": disk_w})
        net_docs.append({"agent_id": agent_id, "timestamp": ts, "bytes_sent": net_s, "bytes_received": net_r, "active_connections": net_conn})

        # Add a few dummy process/file events based on rate
        proc_rate = int(ai.get("process_creation_rate_per_sec", 1))
        # Keep rate bounded so we don't insert millions of records
        proc_rate = min(proc_rate, 5)
        for _ in range(proc_rate):
            process_docs.append({"agent_id": agent_id, "timestamp": ts, "event_type": "created"})
            
        file_rate = int(ai.get("file_modification_rate_per_sec", 1))
        file_rate = min(file_rate, 5)
        for _ in range(file_rate):
            file_docs.append({"agent_id": agent_id, "timestamp": ts, "event_type": "modified"})

        count += 1

    if count > 0:
        if cpu_docs: dst_db.cpu_metrics.insert_many(cpu_docs)
        if mem_docs: dst_db.memory_metrics.insert_many(mem_docs)
        if disk_docs: dst_db.disk_metrics.insert_many(disk_docs)
        if net_docs: dst_db.network_metrics.insert_many(net_docs)
        if process_docs: dst_db.process_events.insert_many(process_docs)
        if file_docs: dst_db.file_events.insert_many(file_docs)

    print(f"Migrated {count} snapshots to shadowpulse database under agent {agent_id}.")

if __name__ == "__main__":
    migrate()
