import styled from 'styled-components';

export default function InformationSection() {
  return (
    <Wrapper>
      <h3>Liên hệ Kapendt Lab</h3>
      <p>
        <strong>Email hỗ trợ:</strong> hello@kapendtlab.com
      </p>
      <p>
        <strong>Hotline tư vấn:</strong> +84 123 456 789
      </p>
      <p>
        <strong>Mạng xã hội:</strong> Facebook · LinkedIn · YouTube
      </p>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  flex: 1;
  margin-right: 3rem;
  margin-bottom: 3rem;

  h3 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }

  p {
    font-weight: normal;
    font-size: 1.6rem;
    color: rgba(var(--text), 0.7);
  }

  span {
    opacity: 1;
    color: rgba(var(--text), 1);
  }
`;
