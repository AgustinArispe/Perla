import logo from '../assets/perla-negra-symbol.png';

export function PerlaNegraLogo({ className = '' }: { className?: string }) {
  return (
    <img className={className} src={logo} alt="" width={1280} height={1280} draggable={false} />
  );
}
