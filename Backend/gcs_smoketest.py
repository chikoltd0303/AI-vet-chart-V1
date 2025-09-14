import os, base64, json
from google.oauth2 import service_account
from google.cloud import storage

# 1) 環境変数から資格情報を復元
b64 = os.environ["GOOGLE_SERVICE_ACCOUNT_B64"]
info = json.loads(base64.b64decode(b64))
creds = service_account.Credentials.from_service_account_info(info)

# 2) クライアント作成
bucket_name = os.environ["GCS_BUCKET_NAME"]
client = storage.Client(credentials=creds, project=info["project_id"])
bucket = client.bucket(bucket_name)

# 3) 書き込み＆読み出しテスト
blob = bucket.blob("smoketest/hello.txt")
blob.upload_from_string("ok from AI-vet-chart smoketest")
print("UPLOAD OK:", f"gs://{bucket_name}/{blob.name}")

content = bucket.blob("smoketest/hello.txt").download_as_text()
print("READBACK:", content)
