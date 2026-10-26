const submittedDialableNumbersAreUniqueFromEachOther = async (value: string, meta: any) => {

    const { req } = meta;

    const phone = (req?.body?.phone && (req.body.phone !== "")) ? req.body.phone : undefined;
    const mobile = (req?.body?.mobile && (req.body.mobile !== "")) ? req.body.mobile : undefined;

    if (phone && mobile && (phone === mobile)) {
        throw new Error("Your phone-number cannot be identical to your mobile number.");
    }

    return true;
}

export default submittedDialableNumbersAreUniqueFromEachOther;