/** WCAG contrast between two computed rgb()/rgba() colours, for measuring what axe cannot. */

const channels = (colour: string): number[] => {
	const match = colour.match(/rgba?\(([^)]+)\)/);
	if (!match) throw new Error(`not a measurable colour: ${colour}`);
	return match[1].split(",").map((part) => parseFloat(part));
};

const luminance = (colour: string): number => {
	const [r, g, b] = channels(colour).map((value) => {
		const s = value / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
