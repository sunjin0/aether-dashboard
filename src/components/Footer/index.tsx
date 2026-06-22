import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
        position: 'fixed',
        bottom:0,
        left:0,
        right:0,
      }}
     copyright={`2022-${new Date().getFullYear()} Cloud Chat`}
    />
  );
};

export default Footer;
