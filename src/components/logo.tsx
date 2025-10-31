import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="hsl(var(--primary))">
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
        <path d="M168 93.36a8 8 0 0 0-8.61-7.31l-55.85 9.3a8 8 0 0 0-6.15 7.82V160a8 8 0 0 0 16 0v-43.4l46-7.66a8 8 0 0 0 8.61-7.58Z" />
      </g>
    </svg>
  );
}
