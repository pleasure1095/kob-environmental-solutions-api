const arrNotEmpty = (arr: string[]) => {
    if (arr.length === 0) {
        throw new Error('This field cannot be empty.');
    }

    return true;
}

export default arrNotEmpty;