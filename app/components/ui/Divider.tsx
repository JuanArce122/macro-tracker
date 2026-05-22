type Props = {
  className?: string;
};

export default function Divider({ className = "" }: Props) {
  return <hr className={`border-0 border-t border-border ${className}`} />;
}
