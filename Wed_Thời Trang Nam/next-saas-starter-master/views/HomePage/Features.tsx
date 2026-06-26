import React from 'react';
import styled from 'styled-components';
import AutofitGrid from 'components/AutofitGrid';
import BasicCard from 'components/BasicCard';
import Container from 'components/Container';
import { media } from 'utils/media';

const FEATURES = [
  {
    imageUrl: '/grid-icons/asset-1.svg',
    title: 'Giải pháp AI cho nội dung',
    description: 'Các công cụ sinh nội dung tự động, tối ưu SEO và tối ưu tương tác dành cho doanh nghiệp và nhà sáng tạo.',
  },
  {
    imageUrl: '/grid-icons/asset-2.svg',
    title: 'Quy trình hoạt động',
    description: 'Từ ý tưởng đến xuất bản: thu thập brief, sinh nội dung, hiệu chỉnh và phân phối.',
  },
  {
    imageUrl: '/grid-icons/asset-3.svg',
    title: 'Lợi ích cho doanh nghiệp',
    description: 'Tiết kiệm chi phí sản xuất nội dung, tăng tốc độ ra hàng và nâng cao độ chính xác thông điệp thương hiệu.',
  },
  {
    imageUrl: '/grid-icons/asset-4.svg',
    title: 'Nội dung Marketing',
    description: 'Mẫu bài, chiến dịch email, landing page và nội dung quảng cáo được tối ưu bởi AI.',
  },
  {
    imageUrl: '/grid-icons/asset-5.svg',
    title: 'Video AI',
    description: 'Video quảng cáo, video truyền thông và short video do AI hỗ trợ sáng tạo.',
  },
  {
    imageUrl: '/grid-icons/asset-6.svg',
    title: 'Recommendation & Cá nhân hóa',
    description: 'Đề xuất video/bài viết tương tự và cá nhân hóa trải nghiệm theo hành vi người dùng.',
  },
  {
    imageUrl: '/grid-icons/asset-7.svg',
    title: 'Content Trending',
    description: 'Hiển thị chủ đề thịnh hành và nội dung đang được quan tâm để tăng tương tác.',
  },
  {
    imageUrl: '/grid-icons/asset-8.svg',
    title: 'Tìm kiếm & Lọc nội dung',
    description: 'Tìm kiếm bài viết, video AI và lọc theo chủ đề để người dùng dễ tiếp cận nội dung.',
  },
  {
    imageUrl: '/grid-icons/asset-9.svg',
    title: 'Hỗ trợ & Liên hệ',
    description: 'Đăng ký dịch vụ, yêu cầu tư vấn, báo giá và hỗ trợ trực tuyến qua chatbot.',
  },
];

export default function Features() {
  return (
    <Container>
      <CustomAutofitGrid>
        {FEATURES.map((singleFeature, idx) => (
          <BasicCard key={singleFeature.title} {...singleFeature} />
        ))}
      </CustomAutofitGrid>
    </Container>
  );
}

const CustomAutofitGrid = styled(AutofitGrid)`
  --autofit-grid-item-size: 40rem;

  ${media('<=tablet')} {
    --autofit-grid-item-size: 30rem;
  }

  ${media('<=phone')} {
    --autofit-grid-item-size: 100%;
  }
`;
