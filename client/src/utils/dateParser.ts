/**
 * Natural Language Date Parser
 * Converts phrases like "tomorrow", "next Monday", "in 3 days" to YYYY-MM-DD format
 */

export const parseNaturalDate = (input: string): string | null => {
    const today = new Date();
    const lowered = input.toLowerCase().trim();

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Helper to add days
    const addDays = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // Helper to get next weekday
    const getNextWeekday = (weekday: number): Date => {
        const result = new Date(today);
        const currentDay = today.getDay();
        const daysUntil = (weekday - currentDay + 7) % 7 || 7; // If today is the day, get next week
        result.setDate(today.getDate() + daysUntil);
        return result;
    };

    // Today
    if (lowered === 'today') {
        return formatDate(today);
    }

    // Tomorrow
    if (lowered === 'tomorrow') {
        return formatDate(addDays(today, 1));
    }

    // Yesterday (for reference)
    if (lowered === 'yesterday') {
        return formatDate(addDays(today, -1));
    }

    // Day after tomorrow
    if (lowered === 'day after tomorrow' || lowered === 'overmorrow') {
        return formatDate(addDays(today, 2));
    }

    // In X days/weeks
    const inXDaysMatch = lowered.match(/in (\d+) days?/);
    if (inXDaysMatch) {
        return formatDate(addDays(today, parseInt(inXDaysMatch[1], 10)));
    }

    const inXWeeksMatch = lowered.match(/in (\d+) weeks?/);
    if (inXWeeksMatch) {
        return formatDate(addDays(today, parseInt(inXWeeksMatch[1], 10) * 7));
    }

    // Next weekday (next Monday, next Tuesday, etc.)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const nextWeekdayMatch = lowered.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (nextWeekdayMatch) {
        const targetDay = weekdays.indexOf(nextWeekdayMatch[1]);
        return formatDate(getNextWeekday(targetDay));
    }

    // This weekday (this Monday, Monday, etc.)
    for (let i = 0; i < weekdays.length; i++) {
        if (lowered === weekdays[i] || lowered === `this ${weekdays[i]}`) {
            const currentDay = today.getDay();
            if (i > currentDay) {
                // This week
                return formatDate(addDays(today, i - currentDay));
            } else if (i === currentDay) {
                // Today
                return formatDate(today);
            } else {
                // Next week
                return formatDate(addDays(today, 7 - currentDay + i));
            }
        }
    }

    // End of week (Friday)
    if (lowered === 'end of week' || lowered === 'end of the week' || lowered === 'eow') {
        return formatDate(getNextWeekday(5)); // Friday
    }

    // End of month
    if (lowered === 'end of month' || lowered === 'end of the month' || lowered === 'eom') {
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return formatDate(endOfMonth);
    }

    // Start of next week (Monday)
    if (lowered === 'start of next week' || lowered === 'next week') {
        return formatDate(getNextWeekday(1)); // Monday
    }

    // Weekend (Saturday)
    if (lowered === 'weekend' || lowered === 'this weekend') {
        return formatDate(getNextWeekday(6)); // Saturday
    }

    // Month names (e.g., "December 25" or "25 December" or "Dec 25")
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    // Match "Month Day" or "Month Day, Year"
    for (let i = 0; i < months.length; i++) {
        const monthPattern = new RegExp(`(${months[i]}|${monthAbbr[i]})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, 'i');
        const match = lowered.match(monthPattern);
        if (match) {
            const year = match[3] ? parseInt(match[3], 10) : today.getFullYear();
            const day = parseInt(match[2], 10);
            const date = new Date(year, i, day);
            // If the date is in the past this year, assume next year
            if (!match[3] && date < today) {
                date.setFullYear(date.getFullYear() + 1);
            }
            return formatDate(date);
        }
    }

    // Match "Day Month" format (e.g., "25 December" or "25th December")
    for (let i = 0; i < months.length; i++) {
        const dayMonthPattern = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months[i]}|${monthAbbr[i]})(?:,?\\s*(\\d{4}))?`, 'i');
        const match = lowered.match(dayMonthPattern);
        if (match) {
            const year = match[3] ? parseInt(match[3], 10) : today.getFullYear();
            const day = parseInt(match[1], 10);
            const date = new Date(year, i, day);
            if (!match[3] && date < today) {
                date.setFullYear(date.getFullYear() + 1);
            }
            return formatDate(date);
        }
    }

    // ISO format (YYYY-MM-DD) - pass through
    if (/^\d{4}-\d{2}-\d{2}$/.test(lowered)) {
        return lowered;
    }

    // US format (MM/DD/YYYY or M/D/YYYY)
    const usDateMatch = lowered.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (usDateMatch) {
        const month = parseInt(usDateMatch[1], 10) - 1;
        const day = parseInt(usDateMatch[2], 10);
        const year = usDateMatch[3] ? parseInt(usDateMatch[3], 10) : today.getFullYear();
        return formatDate(new Date(year, month, day));
    }

    // Could not parse
    return null;
};

/**
 * Extract date from a longer sentence
 * e.g., "Add meeting tomorrow at 3pm" -> "tomorrow"
 */
export const extractDateFromText = (text: string): { date: string | null; cleanedText: string } => {
    const patterns = [
        /\b(today)\b/i,
        /\b(tomorrow)\b/i,
        /\b(yesterday)\b/i,
        /\b(next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
        /\b(this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
        /\b(in\s+\d+\s+days?)\b/i,
        /\b(in\s+\d+\s+weeks?)\b/i,
        /\b(end\s+of\s+(the\s+)?week)\b/i,
        /\b(end\s+of\s+(the\s+)?month)\b/i,
        /\b(next\s+week)\b/i,
        /\b(this\s+weekend|weekend)\b/i,
        /\b((january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\b/i,
        /\b(\d{1,2}(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:,?\s*\d{4})?)\b/i,
        /\b(\d{4}-\d{2}-\d{2})\b/,
        /\b(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const datePhrase = match[0];
            const parsedDate = parseNaturalDate(datePhrase);
            if (parsedDate) {
                // Remove the date phrase from the text
                const cleanedText = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
                return { date: parsedDate, cleanedText };
            }
        }
    }

    return { date: null, cleanedText: text };
};

export default { parseNaturalDate, extractDateFromText };
