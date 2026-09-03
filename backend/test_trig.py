import asyncio
from app.services.threat_scoring import compute_and_persist

async def main():
    res = await compute_and_persist(
        'agent-migrated',
        {
            'cpu_usage_percent': 99.9,
            'memory_used_percent': 98.5,
            'disk_used_percent': 95.0,
            'disk_io_rate': 500000000,
            'network_bytes_rate': 1000000000,
            'active_connections': 5000,
            'process_count': 800,
            'new_process_rate': 150,
            'file_event_rate': 3000,
            'system_event_rate': 50
        },
        {}
    )
    print("RES:", res)

asyncio.run(main())
