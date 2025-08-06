interface ExportIconProps {
    /** The size (both width and height) of the icon */
    size?: string
    /** The color of the icon */
    color?: string
}

/** The icon representing exporting */
export default function ExportIcon({size="16", color="#9F9FA3"}: ExportIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 6.5H12.5C12.6326 6.5 12.7598 6.55268 12.8536 6.64645C12.9473 6.74021 13 6.86739 13 7V13C13 13.1326 12.9473 13.2598 12.8536 13.3536C12.7598 13.4473 12.6326 13.5 12.5 13.5H3.5C3.36739 13.5 3.24021 13.4473 3.14645 13.3536C3.05268 13.2598 3 13.1326 3 13V7C3 6.86739 3.05268 6.74021 3.14645 6.64645C3.24021 6.55268 3.36739 6.5 3.5 6.5H5" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5.5 4L8 1.5L10.5 4" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8 1.5V8.5" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
}
