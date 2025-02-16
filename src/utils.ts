import { userPreferencesToDescriptions } from './constants';

// compareFn for sorting preferences based on userPreferencesToDescriptions key order
const preferenceCompareFn = (a: string, b: string): number => {
    // Get the index of both strings in userPreferencesToDescriptions, if they exist
    const aIndex = Object.keys(userPreferencesToDescriptions).indexOf(a);
    const bIndex = Object.keys(userPreferencesToDescriptions).indexOf(b);

    // If both a and b exist in the record, compare their positions
    if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
    }

    // If only one exists in the record, prioritize the one that exists
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // If neither exists in the record, sort them alphabetically or in any way you prefer
    return a.localeCompare(b);
};

function detectContext() {
    if (typeof importScripts === 'function') {
        console.log('Background page detected!');
        return 'background';
    }
    if (window.location.pathname.includes('popup')) {
        console.log('Popup detected!');
        return 'popup';
    }
    return 'unknown';
}

export { preferenceCompareFn };

export const isPopup = () => detectContext() === 'popup';
export const isBackgroundPage = () => detectContext() === 'background';
