import Company from "../db/models/Company";
import { properlizeWords } from "../helpers";

const companyNameIsUnique = async (name: string, meta: any) => {

    const { req } = meta;

    const company = await Company.findOne({ name });

    if (company) {
        if ((req?.params?.id) && (company._id.toString() === req.params.id)) {
            return true;
        }

        throw new Error(`${properlizeWords(name)} has already been registered as a company.`);
    }

    return true;
}

export default companyNameIsUnique;