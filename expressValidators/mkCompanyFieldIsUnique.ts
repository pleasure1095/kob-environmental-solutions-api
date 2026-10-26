import Company from "../db/models/Company";
import { camelCase2Words, properlizeWords } from "../helpers";

const mkCompanyFieldIsUnique = (field: string) => {
    return async (value: string, meta: any) => {
        const { req } = meta;

        const company = await Company.findOne({ [field]: value });

        if (company) {
            if (company._id.toString() === req.params?.id) {
                return true;
            }

            throw new Error(`This "${properlizeWords(camelCase2Words(field))}" has already been chosen. Please, input something else.`)
        }

        return true;
    }
}

export default mkCompanyFieldIsUnique