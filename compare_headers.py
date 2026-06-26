import os
import subprocess

def run_query(query):
    return subprocess.run(["sudo", "mariadb", "-e", query], capture_output=True, text=True)

def read_ibd_flags(file_path):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "rb") as f:
            # InnoDB page size is usually 16KB. Flags are at offset 54 (4 bytes) of the tablespace header (page 0, offset 38 + 16 = 54)
            f.seek(54)
            flags = f.read(4)
            return flags.hex()
    except Exception as e:
        return str(e)

def main():
    db_name = "test_flags_db"
    run_query(f"DROP DATABASE IF EXISTS {db_name};")
    run_query(f"CREATE DATABASE {db_name};")

    configs = [
        ("dynamic_utf8mb4", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC"),
        ("compact_utf8mb4", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT"),
        ("redundant_utf8mb4", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=REDUNDANT"),
        ("compressed_utf8mb4", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED"),
        ("dynamic_latin1", "ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC"),
        ("compact_latin1", "ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT"),
        ("dynamic_utf8mb3", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC"),
        ("compact_utf8mb3", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=COMPACT"),
        ("dynamic_utf8", "ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC"),
        ("compact_utf8", "ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT"),
    ]

    print("Source ibd flag (tbl_baocaoai.ibd):")
    source_flags = read_ibd_flags("/mnt/d/Wed_Thời Trang Nam/web_hthuose/tbl_baocaoai.ibd")
    print(f"  {source_flags}")

    print("\nCreated tables expected flags:")
    for name, options in configs:
        run_query(f"use {db_name}; CREATE TABLE `{name}` (id int PRIMARY KEY) {options};")
        # Read flags from the newly created .ibd file
        # The file is at /var/lib/mysql/test_flags_db/name.ibd
        live_file = f"/var/lib/mysql/{db_name}/{name}.ibd"
        # We need sudo to read it
        subprocess.run(["sudo", "cp", live_file, f"/tmp/{name}.ibd"])
        subprocess.run(["sudo", "chmod", "644", f"/tmp/{name}.ibd"])
        flags = read_ibd_flags(f"/tmp/{name}.ibd")
        print(f"  {name:<25} : {flags} (Match: {flags == source_flags})")
        # Cleanup
        os.remove(f"/tmp/{name}.ibd")

if __name__ == "__main__":
    main()
