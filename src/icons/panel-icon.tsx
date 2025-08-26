interface PanelIconProps {
    color?: string
}

export default function PanelIcon({color = "#9E9EA4"}: PanelIconProps) {
    return (
        <div className="panel-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.66666 8H13.3333M2.66666 4H13.3333M2.66666 12H13.3333" stroke={color} stroke-width="0.666667" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
    );
}
