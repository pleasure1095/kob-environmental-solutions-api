const mkArrValuesMatchOptions = (options: string[]) => {
    return (values: string[]) => {
        let itr = 0;
        let err = '';

        for (const value of values) {
            itr++;
            let isValid = false;

            for (const option of options) {
                if (value === option) {
                    isValid = true;
                    break;
                }
            }

            if (!isValid) {
                if (itr === 1) {
                    err += `"${value}"`
                } else {    
                    err += itr === values.length ? ` and "${value}"` : `, "${value}"`;
                }
            }
        }

        if (err !== '') {
            throw new Error(`${err} ${err.split(' ').length > 1 ? 'are invalid options' : 'is an invalid option'}`)
        }

        return true;
    }
}

export default mkArrValuesMatchOptions;