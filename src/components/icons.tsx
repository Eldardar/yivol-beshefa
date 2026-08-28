type IconProps = { size?: number; className?: string };

function Svg({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="9" cy="8" r="3" />
      <path d="M17.5 19v-1.5a3.5 3.5 0 0 0-2.3-3.29" />
      <path d="M14.7 4.21a3 3 0 0 1 0 5.58" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5M16 3v3.5" />
    </Svg>
  );
}

export function ClipboardListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </Svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4.5V8h3.5" />
      <path d="M12 8v4.5l3 2" />
    </Svg>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3.5-2.5-6-6.5-6C5.5 11 8 13 12 13Z" />
      <path d="M12 10c0-4 2.8-6.5 7-6.5.4 4.8-2.4 7.5-7 7.5" />
    </Svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5h10.5v9H3z" />
      <path d="M13.5 10.5H17l3 3v3h-2.5" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </Svg>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M3 20h18" />
    </Svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.3 5.2 1.5 5.5H4.5C4.7 15.7 6 14.5 6 10.5Z" />
      <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5V19a7 7 0 0 1 14 0v.5" />
    </Svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M14 15.5 18.5 12 14 8.5" />
      <path d="M18.3 12H9" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props} className={props.className}>
      <polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

/** Visual glyph pointing left (←) — pick by the direction it should point, not by RTL semantics. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Svg>
  );
}

/** Visual glyph pointing right (→) — pick by the direction it should point, not by RTL semantics. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.3 12.7 18 5" />
      <path d="M15.5 7.5 18 10M18.5 5.5 21 8" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l.8-3.6L15.6 5.6a1.8 1.8 0 0 1 2.6 0l.2.2a1.8 1.8 0 0 1 0 2.6L7.6 19.2 4 20Z" />
      <path d="M14.2 7.2l2.6 2.6" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L15 13l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4Z" />
    </Svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5 5.5-6" />
    </Svg>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
    </Svg>
  );
}
