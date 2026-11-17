print("Beginning packaging...")
import json, subprocess
from pathlib import Path
with open("package.json", "r", encoding="utf-8") as f:
    data = json.load(f)
version=(data["version"])
export_path=f"export/physics+_{version}.js"
print(f"exporting physics+ version {version} as {export_path}.")
p = Path(export_path)
if p.exists() and p.is_file():
    print("failed: version already exists")
else:
    subprocess.run(["rollup", "-c", "-o", export_path], check=True)
    print("Package sucess!")