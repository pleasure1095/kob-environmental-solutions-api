import ProductCategory from "../db/models/ProductCategory";

const productCategoryWithIdExists = async (id: string) => {
  
    const productCategory = await ProductCategory.findOne({_id: id});

    if (productCategory) {
        return true;
    }

    throw  new Error('Invalid rental-item-ID.');
}

export default productCategoryWithIdExists;