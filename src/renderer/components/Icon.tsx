import type { CSSProperties } from 'react';
import download from '../assets/coolicons/download.svg';
import activity from '../assets/coolicons/activity.svg';
import arrow from '../assets/coolicons/arrow.svg';
import box from '../assets/coolicons/box.svg';
import bell from '../assets/coolicons/bell.svg';
import cash from '../assets/coolicons/cash.svg';
import chart from '../assets/coolicons/chart.svg';
import check from '../assets/coolicons/check.svg';
import clock from '../assets/coolicons/clock.svg';
import close from '../assets/coolicons/close.svg';
import collapse from '../assets/coolicons/collapse.svg';
import edit from '../assets/coolicons/edit.svg';
import expand from '../assets/coolicons/expand.svg';
import help from '../assets/coolicons/help.svg';
import history from '../assets/coolicons/history.svg';
import key from '../assets/coolicons/key.svg';
import logout from '../assets/coolicons/logout.svg';
import plus from '../assets/coolicons/plus.svg';
import search from '../assets/coolicons/search.svg';
import settings from '../assets/coolicons/settings.svg';
import stock from '../assets/coolicons/stock.svg';
import tag from '../assets/coolicons/tag.svg';
import upload from '../assets/coolicons/upload.svg';
import users from '../assets/coolicons/users.svg';

const icons = {
  download,
  activity,
  bell,
  arrow,
  box,
  cash,
  chart,
  check,
  clock,
  close,
  collapse,
  edit,
  expand,
  help,
  history,
  key,
  logout,
  plus,
  search,
  settings,
  stock,
  tag,
  upload,
  users,
} as const;
export function Icon({
  name,
  size = 22,
  style,
}: {
  name: keyof typeof icons;
  size?: number;
  style?: CSSProperties;
}) {
  const mask = `url("${icons[name]}")`;
  return (
    <span
      className="coolicon"
      aria-hidden="true"
      style={{ width: size, height: size, maskImage: mask, WebkitMaskImage: mask, ...style }}
    />
  );
}
