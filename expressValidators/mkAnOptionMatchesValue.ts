
/**
 * Checks if, at least 1, element--of a supplied array--matches a passed value
 * @param {*} value 
 * @returns 
 */
const mkAnOptionMatchesValue = (value: string) => {
    return (arr: string[]) => {
        for (const option of arr) {
            if (option === value) {
                return true;
            }
        }

        throw new Error(`Required value missing in supplied options.`);
    }
};

export default mkAnOptionMatchesValue;