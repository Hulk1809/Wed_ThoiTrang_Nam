import os
import xml.etree.ElementTree as ET
import subprocess

def run_docker_mysql(query):
    # Runs query in MariaDB container and returns results as XML, then parses to list of dicts
    cmd = [
        "sudo", "docker", "exec", "db104", 
        "mysql", "-u", "root", "-e", query, 
        "--xml"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing query: {query}\nError: {result.stderr}")
        return []
    try:
        if not result.stdout.strip():
            return []
        
        # Parse XML
        root = ET.fromstring(result.stdout)
        rows = []
        for row_elem in root.findall('row'):
            row_dict = {}
            for field in row_elem.findall('field'):
                name = field.get('name')
                # Handle NULL values (represented by xsi:nil="true")
                is_nil = False
                for key, val in field.attrib.items():
                    if key.endswith('nil') and val == 'true':
                        is_nil = True
                
                val = None if is_nil else field.text
                row_dict[name] = val
            rows.append(row_dict)
        return rows
    except Exception as e:
        print(f"Failed to parse XML: {e}\nRaw stdout: {result.stdout}")
        return []

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    val_str = str(val).replace("'", "''")
    return f"N'{val_str}'"

def main():
    db_name = "web_hthuose"
    out_file = "/mnt/d/Wed_Thời Trang Nam/import_to_sqlserver.sql"

    # 1. Start container
    print("Ensuring db104 container is started...")
    subprocess.run(["sudo", "docker", "start", "db104"])
    # Wait for MySQL to be ready
    import time
    time.sleep(3)

    sql_statements = []
    sql_statements.append("BEGIN TRANSACTION;")
    sql_statements.append("USE GuynDb;")
    sql_statements.append("PRINT 'Starting migration...';\n")

    # Clear existing data in correct dependency order
    sql_statements.append("DELETE FROM UserBehaviors;")
    sql_statements.append("DELETE FROM VideoTrackings;")
    sql_statements.append("DELETE FROM OrderItems;")
    sql_statements.append("DELETE FROM Orders;")
    sql_statements.append("DELETE FROM CartItems;")
    sql_statements.append("DELETE FROM Carts;")
    sql_statements.append("DELETE FROM Products;")
    sql_statements.append("DELETE FROM Users;")
    sql_statements.append("PRINT 'Existing data cleared.';\n")

    # A. Migrate Users
    print("Fetching users...")
    users_data = run_docker_mysql("use web_hthuose; select * from users;")
    sql_statements.append("SET IDENTITY_INSERT Users ON;")
    for row in users_data:
        uid = int(row['id'])
        name = row['ho_ten'] if row.get('ho_ten') else f"User {uid}"
        email = row['email']
        pw_hash = row['mat_khau'] if row.get('mat_khau') else "$2b$10$wE6vY92hX5nUu47l2p3d.O0h8x.o1K9p1q8r7s6t5u4v3w2x1y"
        role = row['vai_tro'] if row.get('vai_tro') else "user"
        created_at = row['ngay_tao']

        sql_statements.append(
            f"INSERT INTO Users (Id, Name, Email, PasswordHash, Role, CreatedAt) "
            f"VALUES ({uid}, {escape_sql(name)}, {escape_sql(email)}, {escape_sql(pw_hash)}, {escape_sql(role)}, '{created_at}');"
        )
    sql_statements.append("SET IDENTITY_INSERT Users OFF;")
    sql_statements.append("PRINT 'Users migrated.';\n")

    # B. Migrate Products
    print("Fetching products...")
    products_data = run_docker_mysql("use web_hthuose; select * from tbl_sanpham;")
    sql_statements.append("SET IDENTITY_INSERT Products ON;")
    for row in products_data:
        pid = int(row['id'])
        name = row['ten_san_pham']
        price = float(row['gia'])
        image = row['hinh_anh']
        desc = row['mo_ta'] if row.get('mo_ta') else ""
        stock = int(row['so_luong'])
        cat_id = int(row['category_id'])

        # Category mapping
        cat_map = {1: "áo khoác", 2: "áo nỉ", 3: "áo polo", 4: "áo blazer"}
        category = cat_map.get(cat_id, "áo")

        # Mocking size, color based on category
        size = "M,L,XL"
        color = "Đen,Xám,Trắng"
        if category == "áo khoác":
            size = "S,M,L,XL,XXL"
            color = "8 Màu"
        elif category == "áo len":
            size = "S,M,L"
            color = "5 Màu"

        sql_statements.append(
            f"INSERT INTO Products (Id, Name, Price, OriginalPrice, Discount, Category, Size, Color, Stock, Image, Description, PreviewImages, VideoUrl) "
            f"VALUES ({pid}, {escape_sql(name)}, {price}, {price}, 0, {escape_sql(category)}, {escape_sql(size)}, {escape_sql(color)}, {stock}, {escape_sql(image)}, {escape_sql(desc)}, N'', N'');"
        )
    sql_statements.append("SET IDENTITY_INSERT Products OFF;")
    sql_statements.append("PRINT 'Products migrated.';\n")

    # C. Migrate Orders
    print("Fetching orders...")
    orders_data = run_docker_mysql("use web_hthuose; select * from tbl_donhang;")
    sql_statements.append("SET IDENTITY_INSERT Orders ON;")
    for row in orders_data:
        oid = int(row['id'])
        uid = row.get('user_id')
        total = float(row['tong_tien'])
        status = row['trang_thai']
        address = row['dia_chi_giao_hang']
        odate = row['ngay_dat']

        uid_val = int(uid) if uid else 1

        sql_statements.append(
            f"INSERT INTO Orders (Id, UserId, TotalAmount, OrderStatus, ShippingAddress, OrderDate) "
            f"VALUES ({oid}, {uid_val}, {total}, {escape_sql(status)}, {escape_sql(address)}, '{odate}');"
        )
    sql_statements.append("SET IDENTITY_INSERT Orders OFF;")
    sql_statements.append("PRINT 'Orders migrated.';\n")

    # E. Migrate OrderItems
    print("Fetching order items...")
    items_data = run_docker_mysql("use web_hthuose; select * from tbl_chitietdonhang;")
    sql_statements.append("SET IDENTITY_INSERT OrderItems ON;")
    for row in items_data:
        iid = int(row['id'])
        oid = int(row['donhang_id'])
        pid = int(row['product_id'])
        qty = int(row['so_luong'])
        price = float(row['don_gia'])

        sql_statements.append(
            f"INSERT INTO OrderItems (Id, OrderId, ProductId, Quantity, Price) "
            f"VALUES ({iid}, {oid}, {pid}, {qty}, {price});"
        )
    sql_statements.append("SET IDENTITY_INSERT OrderItems OFF;")
    sql_statements.append("PRINT 'Order items migrated.';\n")

    # F. Migrate UserBehaviors (consisting of tbl_hanhvinguoidung + tbl_tukhoatimkiem + tbl_theodoicuontrang)
    print("Fetching user behaviors...")
    behaviors_data = run_docker_mysql("use web_hthuose; select * from tbl_hanhvinguoidung;")
    sql_statements.append("SET IDENTITY_INSERT UserBehaviors ON;")
    
    max_id = 0
    for row in behaviors_data:
        bid = int(row['id'])
        if bid > max_id:
            max_id = bid
        uid = int(row['user_id'])
        pid = row.get('product_id')
        pid_val = int(pid) if pid else "NULL"
        action = row['action_type']
        created_at = row['created_at']

        # Event type mapping
        event_map = {
            "view_product": "view",
            "click_product": "click",
            "add_to_cart": "add_to_cart",
            "purchase": "purchase",
            "search_product": "search"
        }
        event_type = event_map.get(action, action)
        page_name = "chitietsp" if event_type in ["view", "click"] else "index"

        sql_statements.append(
            f"INSERT INTO UserBehaviors (Id, UserId, EventType, ProductId, EventData, DurationSeconds, PageName, Interest, StartedAt, EndedAt, CreatedAt) "
            f"VALUES ({bid}, {uid}, {escape_sql(event_type)}, {pid_val}, N'', NULL, {escape_sql(page_name)}, NULL, NULL, NULL, '{created_at}');"
        )

    # Migrate Search Keywords into UserBehaviors
    print("Fetching search keywords...")
    keywords_data = run_docker_mysql("use web_hthuose; select * from tbl_tukhoatimkiem;")
    for row in keywords_data:
        max_id += 1
        uid = int(row['user_id'])
        keyword = row['keyword']
        created_at = row['created_at']

        sql_statements.append(
            f"INSERT INTO UserBehaviors (Id, UserId, EventType, ProductId, EventData, DurationSeconds, PageName, Interest, StartedAt, EndedAt, CreatedAt) "
            f"VALUES ({max_id}, {uid}, N'search', NULL, {escape_sql(keyword)}, NULL, N'sanpham', NULL, NULL, NULL, '{created_at}');"
        )

    # Migrate Page Scroll into UserBehaviors
    print("Fetching scroll trackings...")
    scroll_data = run_docker_mysql("use web_hthuose; select * from tbl_theodoicuontrang;")
    for row in scroll_data:
        max_id += 1
        uid = int(row['user_id'])
        page = row['page_name']
        depth = int(row['scroll_depth'])
        dur = int(row['duration_seconds'])
        created_at = row['created_at']

        sql_statements.append(
            f"INSERT INTO UserBehaviors (Id, UserId, EventType, ProductId, EventData, DurationSeconds, PageName, Interest, StartedAt, EndedAt, CreatedAt) "
            f"VALUES ({max_id}, {uid}, N'scroll', NULL, N'scroll_depth: {depth}%', {dur}, {escape_sql(page)}, NULL, NULL, NULL, '{created_at}');"
        )

    sql_statements.append("SET IDENTITY_INSERT UserBehaviors OFF;")
    sql_statements.append("PRINT 'User behaviors migrated.';\n")

    # G. Migrate VideoTrackings
    print("Fetching video trackings...")
    video_data = run_docker_mysql("use web_hthuose; select * from tbl_theodoivideo;")
    sql_statements.append("SET IDENTITY_INSERT VideoTrackings ON;")
    for row in video_data:
        vid = int(row['id'])
        uid = int(row['user_id'])
        pid = int(row['product_id'])
        wtime = int(row['watch_time'])
        rate = float(row['completion_rate'])
        created_at = row['created_at']

        # Calculate total duration
        total_dur = wtime
        if rate > 0:
            total_dur = int(round(wtime / (rate / 100.0)))
        if total_dur < wtime:
            total_dur = wtime

        vurl = f"/videos/product{pid}.mp4"
        vtitle = f"Video Product {pid}"

        sql_statements.append(
            f"INSERT INTO VideoTrackings (Id, UserId, VideoUrl, VideoTitle, WatchedSeconds, TotalDuration, WatchPercentage, Interest, WatchedAt, StartedAt, EndedAt) "
            f"VALUES ({vid}, {uid}, {escape_sql(vurl)}, {escape_sql(vtitle)}, {wtime}, {total_dur}, {rate}, NULL, '{created_at}', NULL, NULL);"
        )
    sql_statements.append("SET IDENTITY_INSERT VideoTrackings OFF;")
    sql_statements.append("PRINT 'Video trackings migrated.';\n")

    sql_statements.append("COMMIT TRANSACTION;")
    sql_statements.append("PRINT 'Migration completed successfully!';")

    # Write SQL to file
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"Done! SQL Server migration script generated at {out_file}")

if __name__ == "__main__":
    main()
