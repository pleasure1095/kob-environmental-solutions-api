const discountIsLesserThanTotalCost = (value: string, meta: any) => {
    const { req } = meta;

    if (req?.body?.totalCost && req?.body?.discount) {

        if (parseFloat(req?.body?.totalCost) > parseFloat(req?.body?.discount)) {
            return true;
        }
        throw new Error('The discount must be lesser than the total cost.');
    }
}

export default discountIsLesserThanTotalCost;