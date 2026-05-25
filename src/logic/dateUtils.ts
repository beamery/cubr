/**
 * Safely parses any date representation (Date object, string, or number) into a valid Date object.
 * Stricter environments like Safari/iOS return "Invalid Date" for timestamps with a space 
 * (e.g. "2023-10-15 11:59:27+00"). This function converts spaces to 'T' for full compatibility.
 */
export function parseSafeDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    
    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? new Date() : dateInput;
    }
    
    if (typeof dateInput === 'string') {
        let cleanStr = dateInput.trim();
        
        // If there's a space separating date and time (e.g., at index 10), replace with 'T'
        if (cleanStr.length >= 19 && cleanStr.charAt(10) === ' ') {
            cleanStr = cleanStr.substring(0, 10) + 'T' + cleanStr.substring(11);
        }
        
        const parsed = new Date(cleanStr);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    
    const fallback = new Date(dateInput);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
}
