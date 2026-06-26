import os
import subprocess
import urllib.request

def main():
    dbsake_path = "/home/ubuntu/dbsake"
    # Download dbsake if it doesn't exist
    if not os.path.exists(dbsake_path):
        print("Downloading dbsake...")
        url = "http://get.dbsake.net"
        urllib.request.urlretrieve(url, dbsake_path)
        os.chmod(dbsake_path, 0o755)

    web_hthuose_dir = "/mnt/d/Wed_Thời Trang Nam/web_hthuose"
    out_file = "/mnt/d/Wed_Thời Trang Nam/schema.sql"

    # Find all .frm files
    frm_files = [f for f in os.listdir(web_hthuose_dir) if f.endswith('.frm')]
    frm_files.sort()

    with open(out_file, "w", encoding="utf-8") as out:
        for f in frm_files:
            file_path = os.path.join(web_hthuose_dir, f)
            print(f"Processing: {f}")
            out.write(f"-- ==========================================\n")
            out.write(f"-- TABLE: {f[:-4]}\n")
            out.write(f"-- ==========================================\n")
            
            # Run dbsake frmdump
            cmd = ["python3.10", dbsake_path, "frmdump", file_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                out.write(result.stdout)
            else:
                out.write(f"-- Error dumping {f}:\n")
                out.write(f"-- {result.stderr}\n")
            out.write("\n\n")

    print(f"Done! Written schemas to {out_file}")

if __name__ == "__main__":
    main()
