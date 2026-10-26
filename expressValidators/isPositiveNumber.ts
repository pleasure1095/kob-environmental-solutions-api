export const isPositiveNumber = (value: string) => {

    if ((parseFloat(value)) > 0) {
        return true;
    }

    throw new Error('A positive number is expected.');
}

export const isZeroPositiveNumber = (value: string) => {

    if ((parseFloat(value)) >= 0) {
        return true;
    }

    throw new Error('It must be greater than or equal to 0.');
}
