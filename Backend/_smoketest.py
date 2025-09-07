import os
import traceback

print('CWD', os.getcwd())
try:
    import main
    print('import main OK')
    try:
        from fastapi.testclient import TestClient
        client = TestClient(main.app)
        r = client.get('/health')
        print('/health', r.status_code, r.text[:200])
    except Exception as e:
        print('TestClient error:', e)
        traceback.print_exc()
except Exception as e:
    print('Import error:', e)
    traceback.print_exc()

