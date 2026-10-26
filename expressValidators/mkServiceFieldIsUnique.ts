import Service from "../db/models/Service";

const mkServiceFieldIsUnique = (field: string) => {
    return async (value: string, others: any) => {

        const { req } = others;

        const service = await Service.findOne({ [field]: value });

        const id = req?.params?.id ?? '';

        if (service && (id ? (id !== service._id.toString()) : true)) {
            throw new Error('This value must be unique to this service.');
        }

        return true;
    }
}

export default mkServiceFieldIsUnique;