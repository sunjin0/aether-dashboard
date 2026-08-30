import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';
import './index.less';

type FooterProps = {
  fixed?: boolean;
};

const Footer: React.FC<FooterProps> = ({ fixed = false }) => {
  if (window.aetherDesktop?.isDesktop) return null;
  return (
    <DefaultFooter
      className={fixed ? 'fixed-footer' : undefined}
      style={{
        background: 'none',
        ...(fixed
          ? {
              position: 'fixed',
              right: 0,
              bottom: 0,
              left: 0,
               zIndex: 10,
               boxSizing: 'border-box',
               height: 56,
              padding: '16px 0',
            }
          : {}),
      }}
      copyright={`2022-${new Date().getFullYear()} Aether`}
    />
  );
};

export default Footer;
