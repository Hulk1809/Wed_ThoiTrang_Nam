import os
import subprocess

def run_docker_mysql(query):
    cmd = ["sudo", "docker", "exec", "db104", "mysql", "-u", "root", "-e", query]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result

def main():
    db_name = "web_hthuose"
    backup_dir = "/mnt/d/Wed_Thời Trang Nam/web_hthuose"
    
    print("Re-creating database inside docker container...")
    run_docker_mysql(f"DROP DATABASE IF EXISTS {db_name};")
    run_docker_mysql(f"CREATE DATABASE {db_name};")

    # Read schema.sql and execute it inside docker
    print("Importing schema.sql inside docker...")
    cmd = "sudo docker exec -i db104 mysql -u root web_hthuose < \"/mnt/d/Wed_Thời Trang Nam/schema.sql\""
    subprocess.run(cmd, shell=True)

    # Get list of tables
    res = run_docker_mysql(f"use {db_name}; show tables;")
    tables = []
    if res.returncode == 0:
        lines = res.stdout.strip().split('\n')[1:] # Skip header
        tables = [line.strip() for line in lines if line.strip()]
    
    print(f"Found tables to restore: {tables}")

    # We define indexes to drop and recreate for the 4 tables
    special_tables = {
        "tbl_donhang": {
            "create": """
                CREATE TABLE `tbl_donhang` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `user_id` int(11) DEFAULT NULL,
                  `tong_tien` decimal(12,2) NOT NULL,
                  `trang_thai` enum('cho_xac_nhan','dang_giao','hoan_thanh','da_huy') NOT NULL,
                  `dia_chi_giao_hang` varchar(255) NOT NULL,
                  `ngay_dat` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            "post_queries": [
                "ALTER TABLE tbl_donhang ADD KEY user_id (user_id);"
            ]
        },
        "tbl_hanhvinguoidung": {
            "create": """
                CREATE TABLE `tbl_hanhvinguoidung` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `user_id` int(11) NOT NULL,
                  `product_id` int(11) NOT NULL,
                  `action_type` varchar(50) NOT NULL,
                  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            "post_queries": [
                "ALTER TABLE tbl_hanhvinguoidung ADD UNIQUE KEY created_at (created_at, action_type);",
                "ALTER TABLE tbl_hanhvinguoidung ADD KEY user_id (user_id);",
                "ALTER TABLE tbl_hanhvinguoidung ADD KEY id_2 (id, user_id, product_id);"
            ]
        },
        "tbl_theodoicuontrang": {
            "create": """
                CREATE TABLE `tbl_theodoicuontrang` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `user_id` int(11) NOT NULL,
                  `page_name` varchar(255) NOT NULL,
                  `scroll_depth` int(11) NOT NULL,
                  `duration_seconds` int(11) NOT NULL,
                  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `email` varchar(100) NOT NULL,
                  PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            "post_queries": [
                "ALTER TABLE tbl_theodoicuontrang ADD UNIQUE KEY email (email);"
            ]
        },
        "users": {
            "create": """
                CREATE TABLE `users` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `ho_ten` varchar(100) DEFAULT NULL,
                  `email` varchar(100) DEFAULT NULL,
                  `mat_khau` varchar(255) DEFAULT NULL,
                  `vai_tro` enum('user','admin') DEFAULT 'user',
                  `ngay_tao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            "post_queries": [
                "ALTER TABLE users ADD UNIQUE KEY email (email);"
            ]
        }
    }

    for table in tables:
        print(f"\n--- Restoring table: {table} ---")

        # Special handling for table name with hyphen in file but not in table (tbl_dulieuk-means)
        file_base = table
        if table == "tbl_dulieuk-means":
            file_base = "tbl_dulieuk@002dmeans"

        ibd_source = os.path.join(backup_dir, f"{file_base}.ibd")
        
        # Check if source exists
        if not os.path.exists(ibd_source):
            print(f"Warning: source ibd file {ibd_source} not found! Skipping.")
            continue

        # If it's a special table, recreate it without secondary indexes
        if table in special_tables:
            print(f"Re-creating {table} without secondary indexes...")
            run_docker_mysql(f"use {db_name}; DROP TABLE IF EXISTS `{table}`;")
            run_docker_mysql(f"use {db_name}; {special_tables[table]['create']}")

        # Discard tablespace
        print(f"Discarding tablespace for {table}...")
        res_discard = run_docker_mysql(f"use {db_name}; ALTER TABLE `{table}` DISCARD TABLESPACE;")
        if res_discard.returncode != 0:
            print(f"Error discarding: {res_discard.stderr}")
            continue

        # Copy file into container's database directory
        dest_dir = f"/home/ubuntu/mysql_data/{db_name}"
        dest_path = os.path.join(dest_dir, f"{file_base}.ibd")

        print(f"Copying {ibd_source} to host mount path {dest_path}...")
        subprocess.run(["sudo", "cp", ibd_source, dest_path])
        subprocess.run(["sudo", "chown", "999:999", dest_path])
        subprocess.run(["sudo", "chmod", "660", dest_path])

        # Import tablespace
        print(f"Importing tablespace for {table}...")
        res_import = run_docker_mysql(f"use {db_name}; ALTER TABLE `{table}` IMPORT TABLESPACE;")
        if res_import.returncode != 0:
            print(f"Error importing: {res_import.stderr}")
            continue
        
        print(f"Successfully imported tablespace for {table}!")

        # Add secondary indexes back if it's a special table
        if table in special_tables:
            print(f"Re-adding secondary indexes for {table}...")
            for query in special_tables[table]["post_queries"]:
                res_idx = run_docker_mysql(f"use {db_name}; {query}")
                if res_idx.returncode != 0:
                    print(f"Error adding index: {res_idx.stderr}")
                else:
                    print(f"Index query successful: {query}")

    # Verify rows count
    print("\nVerification - Row counts in docker:")
    verify_query = f"use {db_name}; "
    union_parts = [f"select '{t}' as table_name, count(*) as count from `{t}`" for t in tables]
    verify_query += " union ".join(union_parts) + ";"
    res_verify = run_docker_mysql(verify_query)
    print(res_verify.stdout)

if __name__ == "__main__":
    main()
