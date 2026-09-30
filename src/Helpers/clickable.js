// Props that make a clickable element usable from the keyboard: focusable, announced as a
// button, and triggered by Enter or Space as well as by a click.
export function clickable(onClick) {
    return {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(event);
            }
        },
    };
}
