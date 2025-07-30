import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '特种车辆设备管理系统',
  description: '特种车辆设备实时监控与管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}