import ProductCategory from "../db/models/ProductCategory";


const mkProductCategoryFieldIsUnique = (fieldName: string) => {
    return async (value: string) => {
        const productCategory = await ProductCategory.findOne({
            [fieldName]: value
        });

        if (productCategory) {         //the passed field's value already exists in the database
            throw new Error(`This ${fieldName} has already been chosen. Please, input something else`);
        }

        return true;
    }
}

export default mkProductCategoryFieldIsUnique;