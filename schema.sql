-- ==========================================
-- TABLE: tbl_baocaoai
-- ==========================================
--
-- Table structure for table `tbl_baocaoai`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_baocaoai` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `report_content` text NOT NULL,
  `report_type` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_chitietdonhang
-- ==========================================
--
-- Table structure for table `tbl_chitietdonhang`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_chitietdonhang` (
  `id` int(11) NOT NULL,
  `donhang_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `so_luong` int(1) NOT NULL,
  `don_gia` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_danhmucsanpham
-- ==========================================
--
-- Table structure for table `tbl_danhmucsanpham`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_danhmucsanpham` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ten_danh_muc` int(100) NOT NULL,
  `mo_ta` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_dexuatsanpham
-- ==========================================
--
-- Table structure for table `tbl_dexuatsanpham`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_dexuatsanpham` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `recommendation_score` float NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_donhang
-- ==========================================
--
-- Table structure for table `tbl_donhang`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_donhang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `tong_tien` decimal(12,2) NOT NULL,
  `trang_thai` enum('cho_xac_nhan','dang_giao','hoan_thanh','da_huy') NOT NULL,
  `dia_chi_giao_hang` varchar(255) NOT NULL,
  `ngay_dat` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_dulieuk@002dmeans
-- ==========================================
--
-- Table structure for table `tbl_dulieuk-means`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_dulieuk-means` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `thoi_gian_xem` int(11) NOT NULL,
  `so_lan_nhap` int(11) NOT NULL,
  `do_sau_cuon` float NOT NULL,
  `created_at` int(11) NOT NULL,
  `thoi_gian_xem_video` int(11) NOT NULL,
  `so_san_pham_da_xem` int(11) NOT NULL,
  `so_lan_them_gio` int(11) NOT NULL,
  `so_lan_mua` int(11) NOT NULL,
  `nhom_kmeans` int(11) DEFAULT NULL,
  `cap_nhat_luc` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_giohang
-- ==========================================
--
-- Table structure for table `tbl_giohang`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_giohang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(255) NOT NULL,
  `product_id` int(11) NOT NULL,
  `so_luong` int(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_hanhvinguoidung
-- ==========================================
--
-- Table structure for table `tbl_hanhvinguoidung`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_hanhvinguoidung` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL COMMENT 'view_product
click_product
add_to_cart
purchase
view_product
click_product
add_to_cart
purchase
search_product',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `created_at` (`created_at`,`action_type`),
  KEY `id` (`id`),
  KEY `user_id` (`user_id`),
  KEY `id_2` (`id`,`user_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_ketquaphancum
-- ==========================================
--
-- Table structure for table `tbl_ketquaphancum`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_ketquaphancum` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `cluster_id` int(11) NOT NULL,
  `ten_nhom` varchar(100) NOT NULL,
  `mo_ta` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_khachhang
-- ==========================================
--
-- Table structure for table `tbl_khachhang`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_khachhang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `vai_tro` enum('admin','user') NOT NULL,
  `ngay_tao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('hoat_dong','khoa') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_sanpham
-- ==========================================
--
-- Table structure for table `tbl_sanpham`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_sanpham` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ten_san_pham` varchar(255) NOT NULL,
  `gia` decimal(12,2) NOT NULL,
  `hinh_anh` varchar(255) NOT NULL,
  `mo_ta` text NOT NULL,
  `so_luong` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `ngay_tao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_theodoicuontrang
-- ==========================================
--
-- Table structure for table `tbl_theodoicuontrang`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_theodoicuontrang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `page_name` varchar(255) NOT NULL,
  `scroll_depth` int(11) NOT NULL,
  `duration_seconds` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_theodoivideo
-- ==========================================
--
-- Table structure for table `tbl_theodoivideo`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_theodoivideo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `watch_time` int(11) NOT NULL,
  `completion_rate` float NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: tbl_tukhoatimkiem
-- ==========================================
--
-- Table structure for table `tbl_tukhoatimkiem`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `tbl_tukhoatimkiem` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ==========================================
-- TABLE: users
-- ==========================================
--
-- Table structure for table `users`
-- Created with MySQL Version 10.4.32
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ho_ten` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `mat_khau` varchar(255) DEFAULT NULL,
  `vai_tro` enum('user','admin') DEFAULT 'user',
  `ngay_tao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



