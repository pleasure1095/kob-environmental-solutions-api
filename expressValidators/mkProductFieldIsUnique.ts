import Product from "../db/models/Product";


const mkProductFieldIsUnique = (fieldName: string) => {
    return async (value: string) => {
        const product = await Product.findOne({
            [fieldName]: value
        });

        if (product) {         //the passed field's value already exists in the database
            throw new Error(`This ${fieldName} has already been chosen. Please, input something else`);
        }

        return true;
    }
}

export default mkProductFieldIsUnique;