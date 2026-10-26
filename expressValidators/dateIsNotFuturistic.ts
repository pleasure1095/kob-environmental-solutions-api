const dateIsNotFuturistic = (dateString: string) => {

    const date = new Date(dateString);

    if (date.getTime() > (new Date()).getTime()) {
        throw new Error("The inputed date cannot be futuristic.");
    }

    return true;
}

export default dateIsNotFuturistic;