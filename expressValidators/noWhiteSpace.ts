const noWhiteSpace = (value: string) => {

    const words = value.split(' ');

    if (words.length > 1) {
        throw new Error('This field cannot contain space (" ").');
    }

    return true;
}

export default noWhiteSpace;