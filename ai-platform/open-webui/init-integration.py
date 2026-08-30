import json
import os
import stat
import urllib.error
import urllib.request


OPEN_WEBUI_URL = os.getenv("OPEN_WEBUI_URL", "http://open-webui:8080").rstrip("/")
API_KEY_FILE = os.getenv("OPEN_WEBUI_API_KEY_FILE", "/runtime/open-webui-api-key")


def request(method, path, payload=None, token=None, allowed_statuses=(200,)):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}

    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{OPEN_WEBUI_URL}{path}", data=body, headers=headers, method=method
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status_code = response.status
            raw_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        status_code = error.code
        raw_body = error.read().decode("utf-8")

    if status_code not in allowed_statuses:
        raise RuntimeError(
            f"Open WebUI {method} {path} returned {status_code}: {raw_body[:500]}"
        )

    return status_code, json.loads(raw_body) if raw_body else None


_, session = request(
    "POST",
    "/api/v1/auths/signin",
    {"email": "admin@localhost", "password": "admin"},
)
token = session["token"]

_, admin_config = request(
    "GET", "/api/v1/auths/admin/config", token=token
)
admin_config.update(
    {
        "ENABLE_API_KEYS": True,
        "ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS": True,
        "API_KEYS_ALLOWED_ENDPOINTS": "/api/models,/api/chat/completions",
    }
)
request(
    "POST", "/api/v1/auths/admin/config", admin_config, token=token
)

status_code, key_response = request(
    "GET",
    "/api/v1/auths/api_key",
    token=token,
    allowed_statuses=(200, 404),
)

if status_code == 404:
    _, key_response = request(
        "POST", "/api/v1/auths/api_key", {}, token=token
    )

api_key = key_response["api_key"]
if not api_key.startswith("sk-"):
    raise RuntimeError("Open WebUI returned an invalid integration API key")

os.makedirs(os.path.dirname(API_KEY_FILE), exist_ok=True)
temporary_file = f"{API_KEY_FILE}.tmp"

with open(temporary_file, "w", encoding="utf-8") as file:
    file.write(api_key)
    file.write("\n")

os.chmod(temporary_file, stat.S_IRUSR | stat.S_IWUSR)
os.replace(temporary_file, API_KEY_FILE)

print("Open WebUI integration API key is ready.")
