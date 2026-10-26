import Site from "../db/models/Site";
import { camelCase2Words, properlizeWords } from "../helpers";


const mkSiteFieldIsUnique4Owners = (field: string) => {
    return async (value: string, meta: any) => {
        const { req } = meta;
        const site = await Site.findOne({ [field]: value, ownerId: req.body.ownerId });

        if (site) {
            if (site._id.toString() === req.params?.id) {
                return true;
            }

            throw new Error(`This ${properlizeWords(camelCase2Words(field))} has already been chosen. Please, input something else.`)
        }

        return true;
    }
}

export default mkSiteFieldIsUnique4Owners;