import ServiceResource from "../db/models/ServiceResource";

const mkServiceResourceFieldIsUnique = (field: string) => {
    return async (value: string, others: any) => {

        const { req } = others;

        const resource = await ServiceResource.findOne({ [field]: value });

        const id = req?.params?.id ?? '';

        if (resource && (id ? (id !== resource._id.toString()) : true)) {
            throw new Error('This value must be unique to this Resource.');
        }

        return true;
    }
}

export default mkServiceResourceFieldIsUnique;