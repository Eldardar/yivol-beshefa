import Image from "next/image";

const SIZES = { sm: 36, md: 44, lg: 48, xl: 96 } as const;

export function BrandLogo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const px = SIZES[size];
  return <Image src="/logo.png" alt="" width={px} height={px} className={`brand-logo${className ? ` ${className}` : ""}`} style={{ height: px, width: px }} priority={size === "xl"} />;
}

export function BrandLockup({ size = "md", showName = true, className }: { size?: keyof typeof SIZES; showName?: boolean; className?: string }) {
  return (
    <span className={`brand-lockup${className ? ` ${className}` : ""}`}>
      <BrandLogo size={size} />
      {showName && <span>יבול בשפע</span>}
    </span>
  );
}
