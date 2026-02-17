import type { ComponentType, SVGProps } from 'react';

export type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    title?: string;
    titleId?: string;
  }
>;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  icon: IconComponent;
  size?: number;
  decorative?: boolean;
  title?: string;
}

export function Icon({
  icon: IconSvg,
  size = 20,
  decorative = true,
  title,
  ...svgProps
}: IconProps) {
  const ariaLabel = svgProps['aria-label'] ?? title;

  return (
    <IconSvg
      {...svgProps}
      width={size}
      height={size}
      title={title}
      aria-hidden={decorative ? true : svgProps['aria-hidden']}
      role={decorative ? svgProps.role : svgProps.role ?? 'img'}
      aria-label={decorative ? undefined : ariaLabel}
    />
  );
}

