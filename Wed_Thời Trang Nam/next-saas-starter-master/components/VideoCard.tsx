import NextImage from 'next/image';
import NextLink from 'next/link';
import styled from 'styled-components';
import { media } from 'utils/media';

export interface VideoCardProps {
  title: string;
  slug: string;
  thumbnailUrl: string;
  description: string;
  category: string;
}

export default function VideoCard({ title, slug, thumbnailUrl, description, category }: VideoCardProps) {
  return (
    <NextLink href={'/videos/' + slug} passHref>
      <VideoCardWrapper className="video-card-wrapper">
        <HoverEffectContainer>
          <ImageContainer>
            <NextImage src={thumbnailUrl} layout="fill" objectFit="cover" alt={title} />
            <CategoryBadge>{category}</CategoryBadge>
            <PlayButton>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </PlayButton>
          </ImageContainer>
          <Content>
            <Title>{title}</Title>
            <Description>{description}</Description>
          </Content>
        </HoverEffectContainer>
      </VideoCardWrapper>
    </NextLink>
  );
}

const VideoCardWrapper = styled.a`
  display: flex;
  flex-direction: column;
  height: 45rem;
  max-width: 35rem;
  overflow: hidden;
  text-decoration: none;
  border-radius: 0.6rem;
  background: rgb(var(--cardBackground));
  cursor: pointer;
  color: rgb(var(--text));
`;

const HoverEffectContainer = styled.div`
  transition: transform 0.3s;
  backface-visibility: hidden;
  will-change: transform;

  &:hover {
    border-radius: 0.6rem;
    overflow: hidden;
    transform: scale(1.025);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 20rem;

  &:before {
    display: block;
    content: '';
    width: 100%;
    padding-top: calc((9 / 16) * 100%);
  }

  & > div:first-child {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  ${media('<=desktop')} {
    width: 100%;
  }
`;

const CategoryBadge = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  z-index: 10;
`;

const PlayButton = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4.8rem;
  height: 4.8rem;
  background: rgba(var(--primary), 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
  opacity: 0.8;
  transition: opacity 0.2s;

  ${HoverEffectContainer}:hover & {
    opacity: 1;
  }

  svg {
    width: 2.4rem;
    height: 2.4rem;
    margin-left: 0.4rem;
  }
`;

const Content = styled.div`
  padding: 0 2rem;

  & > * {
    margin-top: 2rem;
  }
`;

const Title = styled.h4`
  font-size: 1.8rem;

  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const Description = styled.p`
  font-size: 1.6rem;

  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
`;