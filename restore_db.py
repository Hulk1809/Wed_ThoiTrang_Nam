import os
import subprocess
import shutil

def run_mysql_query(query):
    # Runs a mysql query as root
    cmd = ["sudo", "mariadb", "-e", query]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result

def main():
    db_name = "web_hthuose"
    backup_dir = "/mnt/d/Wed_Thời Trang Nam/web_hthuose"
    live_db_dir = f"/var/lib/mysql/{db_name}"

    print("Re-creating database...")
    run_mysql_query(f"DROP DATABASE IF EXISTS {db_name};")
    run_mysql_query(f"CREATE DATABASE {db_name};")

    print("Importing schema.sql...")
    cmd = f"sudo mariadb {db_name} < \"/mnt/d/Wed_Thời Trang Nam/schema.sql\""
    subprocess.run(cmd, shell=True)

    # Get list of tables
    print("Getting list of tables...")
    res = run_mysql_query(f"use {db_name}; show tables;")
    tables = []
    if res.returncode == 0:
        lines = res.stdout.strip().split('\n')[1:] # Skip header
        tables = [line.strip() for line in lines if line.strip()]
    
    print(f"Found tables: {tables}")

    for table in tables:
        print(f"\n--- Restoring table: {table} ---")

        # Special handling for table name with hyphen in file but not in table (tbl_dulieuk-means)
        # File name is tbl_dulieuk@002dmeans.ibd, but table name is `tbl_dulieuk-means`
        file_base = table
        if table == "tbl_dulieuk-means":
            file_base = "tbl_dulieuk@002dmeans"

        ibd_source = os.path.join(backup_dir, f"{file_base}.ibd")
        ibd_dest = os.path.join(live_db_dir, f"{file_base}.ibd")

        if not os.path.exists(ibd_source):
            print(f"Warning: ibd file {ibd_source} not found! Skipping tablespace import.")
            continue

        print(f"Discarding tablespace for {table}...")
        res_discard = run_mysql_query(f"use {db_name}; ALTER TABLE `{table}` DISCARD TABLESPACE;")
        if res_discard.returncode != 0:
            print(f"Error discarding tablespace for {table}: {res_discard.stderr}")
            continue

        print(f"Copying {ibd_source} -> {ibd_dest}...")
        subprocess.run(["sudo", "cp", ibd_source, ibd_dest])
        subprocess.run(["sudo", "chown", "mysql:mysql", ibd_dest])
        subprocess.run(["sudo", "chmod", "660", ibd_dest])

        print(f"Importing tablespace for {table}...")
        res_import = run_mysql_query(f"use {db_name}; ALTER TABLE `{table}` IMPORT TABLESPACE;")
        if res_import.returncode != 0:
            print(f"Error importing tablespace for {table}: {res_import.stderr}")
        else:
            print(f"Successfully imported tablespace for {table}!")

    # Verify rows count
    print("\nVerification - Row counts:")
    verify_query = f"use {db_name}; "
    union_parts = [f"select '{t}' as table_name, count(*) as count from `{t}`" for t in tables]
    verify_query += " union ".join(union_parts) + ";"
    res_verify = run_mysql_query(verify_query)
    print(res_verify.stdout)

if __name__ == "__main__":
    main()
