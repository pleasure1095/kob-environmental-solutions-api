import { csvToArray } from "../helpers";

const mkCSVMatchOptions = (options: any) => {
    return (value: any) => {

        const values = csvToArray(value);

        let err = '';
        let itr = 0;

        for (const aValue of values) {

            let vIsValid = false;       //truth on whether the current value is valid or not

            for (const option of options) {
                if (aValue === option) {
                    vIsValid = true;
                    break;
                }
            }

            if (!vIsValid) {

                err += (err !== '') && (itr !== values.length - 1) ? ', ' : '';
                err += (err !== '') && (itr === values.length - 1) ? ' ' : '';
                err += (++itr === values.length) && err !== '' ? `and '${aValue}'` : `'${aValue}'`
            }

        }

        if (err !== '') {

            if (err.split(' ').length > 1) {
                throw new Error(`${err} are invalid options.`);
            } else {
                throw new Error(`${err} is an invalid option.`);
            }

        }

        return true;
    }
}

export default mkCSVMatchOptions;
