import Product from "../db/models/Product";

const productWithIdExists = async (id: string) => {
  
    const product = await Product.findOne({_id: id});

    if (product) {
        return true;
    }

    throw  new Error('Invalid rental-item-ID.');
}

export default productWithIdExists;