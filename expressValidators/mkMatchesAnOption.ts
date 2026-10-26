const mkMatchesAnOption = (options: string[]) => {
    return (value: string) => {
        for (const option of options) {
            if (value === option) {
                return true;
            }
        }

        throw new Error(`'${value}' is an invalid option`)
    }
}


export default mkMatchesAnOption;